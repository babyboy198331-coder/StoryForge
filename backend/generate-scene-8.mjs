/**
 * One-off script: adds Scene 8 to Dragon Delivery Service
 *
 * Run from the backend/ directory: node generate-scene-8.mjs
 *
 * Steps:
 *  1. Download start/end images from Pollinations for scene 8
 *  2. Synthesize new 8-scene narration via Edge TTS
 *  3. Render scene 8 silent clip via FFmpeg
 *  4. Strip audio from existing output.mp4
 *  5. Concatenate video-only + scene 8 clip
 *  6. Mix in new narration → new output.mp4
 *  7. Update feed.json
 *  8. Copy to featured-combined.mp4
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";
import ffmpegPath from "ffmpeg-static";
import ffmpeg from "fluent-ffmpeg";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import os from "os";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

ffmpeg.setFfmpegPath(ffmpegPath);

const REEL_ID = "7a9093c3-ca3f-42c4-8278-0fd4f0ccfdd7";
const STORAGE_DIR = path.join(__dirname, "storage");
const REEL_DIR = path.join(STORAGE_DIR, REEL_ID);
const FEED_PATH = path.join(STORAGE_DIR, "feed.json");
const FEATURED_PATH = path.join(STORAGE_DIR, "featured-combined.mp4");
const CAPTION_FONT = "C:/Windows/Fonts/arialbd.ttf";
const OUTPUT_FPS = 30;

// ── Scene 8 content ──────────────────────────────────────────────────────────

const SCENE_8_NARRATION =
  "But one morning, long before the kingdom stirs, Ember discovers a mysterious package at her door — sealed with ancient runes and glowing with magic she has never seen before. Only she can uncover its secret. And so the adventure truly begins.";

const SCENE_8 = {
  scene: 8,
  visual:
    "Ember stands at her doorstep before dawn, staring down at a mysterious package that glows with soft blue enchanted light, ancient runes etched into its surface",
  narration: SCENE_8_NARRATION,
  camera: "Low angle slow push-in, Ember silhouetted against a purple pre-dawn sky",
  duration_seconds: 9,
  characters_present: ["Ember"],
};

const EMBER_DESC =
  "Ember, a small 5-year-old dragon with scales shimmering in shades of orange and red, short spiky hair, slender build, wearing a tiny brown leather backpack, and a distinctive scar above her left eyebrow";

const IMG_START_PROMPT =
  `Fantasy adventure comic art, low angle shot of ${EMBER_DESC}, standing at her stone doorstep before dawn, ` +
  `looking down at a mysterious package glowing with enchanted blue light, ancient runes etched on its surface, ` +
  `purple pre-dawn sky behind her, dramatic backlit silhouette, warm orange scales catching blue glow, ` +
  `bold ink outlines, halftone texture, dynamic comic shading, 9:16 vertical panel composition`;

const IMG_END_PROMPT =
  `Fantasy adventure comic art, close-up low angle shot, ${EMBER_DESC} crouching down, ` +
  `her clawed hand reaching toward a mysterious glowing blue package on a stone doorstep, ` +
  `ancient runes glowing on the package surface, pre-dawn purple sky, atmospheric foggy blue light, ` +
  `wide eyes reflecting the magic glow, bold ink outlines, screentone texture, 9:16 vertical panel composition`;

// Existing narrations from scenes 1-7 + new scene 8
const ALL_NARRATIONS = [
  "In a magical kingdom, where dragons and magic are a part of everyday life, meet Ember, the youngest member of the Dragon Delivery Service.",
  "With her keen sense of direction and agility, Ember navigates the kingdom, delivering packages to even the most remote locations.",
  "From the bustling markets of Willowdale to the snow-capped mountains of Frostbite Peak, Ember's deliveries bring joy and excitement to the people of the kingdom.",
  "With a keen sense of responsibility, Ember carefully collects and delivers each package, earning the trust of her clients.",
  "Even in the most challenging weather conditions, Ember perseveres, determined to complete her deliveries.",
  "After a long day of flying and delivering, Ember returns home to the warm welcome of her fellow dragons.",
  "As the sun sets on another successful day, Ember reflects on the joy and purpose she finds in her work as a dragon courier.",
  SCENE_8_NARRATION,
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function log(msg) { console.log(msg); }

async function downloadImage(prompt, seed, destPath) {
  const url =
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
    `?width=1080&height=1920&nologo=true&seed=${seed}`;
  log(`  Fetching: ${url.slice(0, 80)}...`);
  const res = await fetch(url, { timeout: 60000 });
  if (!res.ok) throw new Error(`Image fetch failed: ${res.status}`);
  const buf = await res.buffer();
  if (buf.length < 5000) throw new Error(`Suspiciously small image (${buf.length} bytes) — Pollinations may have returned an error page`);
  fs.writeFileSync(destPath, buf);
  log(`  Saved ${buf.length} bytes → ${path.basename(destPath)}`);
}

async function synthesizeNarration(texts) {
  const text = texts.join(" ");
  const tmpDir = path.join(os.tmpdir(), `edge-tts-${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  try {
    const tts = new MsEdgeTTS();
    await tts.setMetadata("en-US-AriaNeural", OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioFilePath } = await tts.toFile(tmpDir, text);
    return fs.readFileSync(audioFilePath);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

function wrapCaption(text, maxChars = 28) {
  const words = text.trim().split(/\s+/);
  const lines = [];
  let cur = "";
  for (const w of words) {
    const cand = cur ? `${cur} ${w}` : w;
    if (cand.length > maxChars && cur) { lines.push(cur); cur = w; } else cur = cand;
  }
  if (cur) lines.push(cur);
  return lines
    .join("\n")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "'\\''")
    .split("\n").join("\\n");
}

function renderSceneClip(startImg, endImg, narration, duration, outputPath) {
  return new Promise((resolve, reject) => {
    const half = Math.max(0.05, duration / 2);
    const cmd = ffmpeg();
    cmd.input(startImg).loop(half);
    cmd.input(endImg).loop(half);

    let filter =
      `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,trim=duration=${half},fps=25[a]` +
      `;[1:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,trim=duration=${half},fps=25[b]` +
      `;[a][b]concat=n=2:v=1:a=0[pre]` +
      `;[pre]minterpolate=fps=${OUTPUT_FPS}:mi_mode=blend,trim=duration=${duration},setsar=1`;

    if (fs.existsSync(CAPTION_FONT) && narration) {
      const cap = wrapCaption(narration);
      filter += `,drawtext=fontfile='${CAPTION_FONT}':text='${cap}':fontsize=46:fontcolor=white:box=1:boxcolor=black@0.55:boxborderw=18:line_spacing=10:x=(w-text_w)/2:y=h-th-160`;
    }
    filter += "[outv]";

    cmd
      .complexFilter(filter)
      .outputOptions(["-map [outv]", "-an", "-pix_fmt yuv420p", "-preset", "veryfast"])
      .fps(OUTPUT_FPS)
      .output(outputPath)
      .on("end", () => resolve(outputPath))
      .on("error", reject)
      .run();
  });
}

function runFfmpeg(buildFn) {
  return new Promise((resolve, reject) => {
    const cmd = ffmpeg();
    buildFn(cmd);
    cmd
      .on("end", () => resolve())
      .on("error", reject)
      .run();
  });
}

function stripAudio(inputPath, outputPath) {
  return runFfmpeg(cmd =>
    cmd.input(inputPath)
       .outputOptions(["-c:v copy", "-an"])
       .output(outputPath)
  );
}

function concatAndMix(videoNoAudioPath, scene8ClipPath, narrationPath, outputPath) {
  const listFile = path.join(os.tmpdir(), `sf-concat-${Date.now()}.txt`);
  const v1 = videoNoAudioPath.replace(/\\/g, "/");
  const v2 = scene8ClipPath.replace(/\\/g, "/");
  fs.writeFileSync(listFile, `file '${v1}'\nfile '${v2}'`);

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(listFile).inputOptions(["-f", "concat", "-safe", "0"])
      .input(narrationPath)
      .outputOptions(["-map 0:v", "-c:v copy", "-map 1:a", "-shortest", "-pix_fmt yuv420p"])
      .output(outputPath)
      .on("end", () => { fs.rmSync(listFile, { force: true }); resolve(); })
      .on("error", err => { fs.rmSync(listFile, { force: true }); reject(err); })
      .run();
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  log("=== Dragon Delivery Service — Scene 8 Generator ===\n");

  const startImgPath = path.join(REEL_DIR, "scene-8-start.jpg");
  const endImgPath   = path.join(REEL_DIR, "scene-8-end.jpg");
  const narrationV2  = path.join(REEL_DIR, "narration-v2.mp3");
  const scene8Clip   = path.join(REEL_DIR, "scene-8-clip.mp4");
  const videoNoAudio = path.join(REEL_DIR, "output-video-only.mp4");
  const outputV2     = path.join(REEL_DIR, "output-v2.mp4");
  const outputFinal  = path.join(REEL_DIR, "output.mp4");
  const outputBackup = path.join(REEL_DIR, "output-original.mp4");

  // Step 1 — images
  if (!fs.existsSync(startImgPath)) {
    log("Step 1: Downloading scene-8-start.jpg from Pollinations...");
    await downloadImage(IMG_START_PROMPT, 8001, startImgPath);
  } else {
    log("Step 1: scene-8-start.jpg already exists, skipping.");
  }
  if (!fs.existsSync(endImgPath)) {
    log("Step 1b: Downloading scene-8-end.jpg from Pollinations...");
    await downloadImage(IMG_END_PROMPT, 8002, endImgPath);
  } else {
    log("Step 1b: scene-8-end.jpg already exists, skipping.");
  }

  // Step 2 — narration
  if (!fs.existsSync(narrationV2)) {
    log("\nStep 2: Synthesizing 8-scene narration via Edge TTS...");
    const buf = await synthesizeNarration(ALL_NARRATIONS);
    fs.writeFileSync(narrationV2, buf);
    log(`  Saved ${buf.length} bytes → narration-v2.mp3`);
  } else {
    log("\nStep 2: narration-v2.mp3 already exists, skipping.");
  }

  // Step 3 — render scene 8 clip
  if (!fs.existsSync(scene8Clip)) {
    log("\nStep 3: Rendering scene-8-clip.mp4 (~30s)...");
    await renderSceneClip(startImgPath, endImgPath, SCENE_8.narration, SCENE_8.duration_seconds, scene8Clip);
    log("  scene-8-clip.mp4 rendered.");
  } else {
    log("\nStep 3: scene-8-clip.mp4 already exists, skipping.");
  }

  // Step 4 — strip audio from existing output.mp4
  if (!fs.existsSync(videoNoAudio)) {
    log("\nStep 4: Stripping audio from output.mp4...");
    await stripAudio(outputFinal, videoNoAudio);
    log("  output-video-only.mp4 created.");
  } else {
    log("\nStep 4: output-video-only.mp4 already exists, skipping.");
  }

  // Step 5 — concat + mix narration
  if (!fs.existsSync(outputV2)) {
    log("\nStep 5: Concatenating video + mixing 8-scene narration...");
    await concatAndMix(videoNoAudio, scene8Clip, narrationV2, outputV2);
    log("  output-v2.mp4 created.");
  } else {
    log("\nStep 5: output-v2.mp4 already exists, skipping.");
  }

  // Step 6 — promote v2 to output.mp4
  log("\nStep 6: Promoting output-v2.mp4 → output.mp4...");
  if (!fs.existsSync(outputBackup)) {
    fs.copyFileSync(outputFinal, outputBackup);
    log("  Original backed up as output-original.mp4");
  }
  fs.copyFileSync(outputV2, outputFinal);
  log("  output.mp4 replaced with 8-scene version.");

  // Step 7 — update feed.json
  log("\nStep 7: Updating feed.json...");
  const feed = JSON.parse(fs.readFileSync(FEED_PATH, "utf8"));
  const reelIdx = feed.findIndex(r => r.id === REEL_ID);
  if (reelIdx === -1) throw new Error("Reel not found in feed.json!");

  const scenes = feed[reelIdx].scenes;
  if (!scenes.find(s => s.scene === 8)) {
    scenes.push({
      ...SCENE_8,
      imageUrlStart: `https://image.pollinations.ai/prompt/${encodeURIComponent(IMG_START_PROMPT)}?width=1080&height=1920&nologo=true&seed=8001`,
      imageUrlEnd:   `https://image.pollinations.ai/prompt/${encodeURIComponent(IMG_END_PROMPT)}?width=1080&height=1920&nologo=true&seed=8002`,
    });
    fs.writeFileSync(FEED_PATH, JSON.stringify(feed, null, 2));
    log("  Scene 8 added to feed.json.");
  } else {
    log("  Scene 8 already in feed.json, skipping.");
  }

  // Step 8 — copy to featured-combined.mp4
  log("\nStep 8: Updating featured-combined.mp4...");
  fs.copyFileSync(outputFinal, FEATURED_PATH);
  log("  featured-combined.mp4 updated.");

  log("\n=== DONE! Dragon Delivery Service now has 8 scenes. ===");
  log("Restart the backend and refresh the homepage to see the extended reel.");
}

main().catch(err => {
  console.error("\nFAILED:", err.message || err);
  process.exit(1);
});

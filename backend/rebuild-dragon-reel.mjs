/**
 * Rebuilds Dragon Delivery Service (7a9093c3) from scratch — all 8 scenes.
 *
 * Scenes 1-7: old single-image format (scene-N.jpg used as both start+end)
 * Scene 8:    new start/end format (scene-8-start.jpg / scene-8-end.jpg)
 *
 * Run: node rebuild-dragon-reel.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import ffmpegPath from "ffmpeg-static";
import ffmpeg from "fluent-ffmpeg";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import os from "os";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

ffmpeg.setFfmpegPath(ffmpegPath);

const REEL_ID    = "7a9093c3-ca3f-42c4-8278-0fd4f0ccfdd7";
const REEL_DIR   = path.join(__dirname, "storage", REEL_ID);
const FEED_PATH  = path.join(__dirname, "storage", "feed.json");
const FEATURED   = path.join(__dirname, "storage", "featured-combined.mp4");
const CAPTION_FONT = "C:/Windows/Fonts/arialbd.ttf";
const OUTPUT_FPS = 30;

// Narration text for all 8 scenes
const NARRATIONS = [
  "In a magical kingdom, where dragons and magic are a part of everyday life, meet Ember, the youngest member of the Dragon Delivery Service.",
  "With her keen sense of direction and agility, Ember navigates the kingdom, delivering packages to even the most remote locations.",
  "From the bustling markets of Willowdale to the snow-capped mountains of Frostbite Peak, Ember's deliveries bring joy and excitement to the people of the kingdom.",
  "With a keen sense of responsibility, Ember carefully collects and delivers each package, earning the trust of her clients.",
  "Even in the most challenging weather conditions, Ember perseveres, determined to complete her deliveries.",
  "After a long day of flying and delivering, Ember returns home to the warm welcome of her fellow dragons.",
  "As the sun sets on another successful day, Ember reflects on the joy and purpose she finds in her work as a dragon courier.",
  "But one morning, long before the kingdom stirs, Ember discovers a mysterious package at her door — sealed with ancient runes and glowing with magic she has never seen before. Only she can uncover its secret. And so the adventure truly begins.",
];

// Scene definitions (duration 8s each for 1-7, 9s for 8)
const SCENES = [
  { n: 1, dur: 8, start: path.join(REEL_DIR, "scene-1.jpg"),       end: path.join(REEL_DIR, "scene-1.jpg") },
  { n: 2, dur: 8, start: path.join(REEL_DIR, "scene-2-start.jpg"), end: path.join(REEL_DIR, "scene-2-end.jpg") },
  { n: 3, dur: 8, start: path.join(REEL_DIR, "scene-3.jpg"),       end: path.join(REEL_DIR, "scene-3.jpg") },
  { n: 4, dur: 8, start: path.join(REEL_DIR, "scene-4.jpg"),       end: path.join(REEL_DIR, "scene-4.jpg") },
  { n: 5, dur: 8, start: path.join(REEL_DIR, "scene-5.jpg"),       end: path.join(REEL_DIR, "scene-5.jpg") },
  { n: 6, dur: 8, start: path.join(REEL_DIR, "scene-6.jpg"),       end: path.join(REEL_DIR, "scene-6.jpg") },
  { n: 7, dur: 8, start: path.join(REEL_DIR, "scene-7.jpg"),       end: path.join(REEL_DIR, "scene-7.jpg") },
  { n: 8, dur: 9, start: path.join(REEL_DIR, "scene-8-start.jpg"), end: path.join(REEL_DIR, "scene-8-end.jpg") },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function log(msg) { console.log(msg); }

function wrapCaption(text, maxChars = 28) {
  const words = text.trim().split(/\s+/);
  const lines = [];
  let cur = "";
  for (const w of words) {
    const cand = cur ? `${cur} ${w}` : w;
    if (cand.length > maxChars && cur) { lines.push(cur); cur = w; } else cur = cand;
  }
  if (cur) lines.push(cur);
  return lines.join("\\n")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "'\\''");
}

function renderSceneClip(startImg, endImg, narration, duration, outputPath, force = false) {
  if (!force && fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1000) {
    log(`  [skip] ${path.basename(outputPath)} already exists`);
    return Promise.resolve(outputPath);
  }
  return new Promise((resolve, reject) => {
    const half = Math.max(0.05, duration / 2);
    const sameImage = startImg === endImg;
    const cmd = ffmpeg();

    let filter;
    if (sameImage) {
      // Single static image — just loop it for the full duration, no minterpolate
      cmd.input(startImg).loop(duration);
      filter =
        `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,` +
        `setsar=1,trim=duration=${duration},fps=${OUTPUT_FPS}`;
    } else {
      cmd.input(startImg).loop(half);
      cmd.input(endImg).loop(half);
      filter =
        `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,trim=duration=${half},fps=25[a]` +
        `;[1:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,trim=duration=${half},fps=25[b]` +
        `;[a][b]concat=n=2:v=1:a=0[pre]` +
        `;[pre]minterpolate=fps=${OUTPUT_FPS}:mi_mode=blend,trim=duration=${duration},setsar=1`;
    }

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

function assembleFinal(clipPaths, narrationPath, outputPath) {
  return new Promise((resolve, reject) => {
    const cmd = ffmpeg();
    for (const p of clipPaths) cmd.input(p);
    cmd.input(narrationPath);

    const n = clipPaths.length;
    // Use concat filter (not demuxer) so codec differences between clips don't matter
    const concatInputs = clipPaths.map((_, i) => `[${i}:v]`).join("");
    const filterStr = `${concatInputs}concat=n=${n}:v=1:a=0[outv]`;

    cmd
      .complexFilter([filterStr])
      .outputOptions([
        "-map [outv]",
        `-map ${n}:a`,
        "-c:v libx264", "-preset", "veryfast",
        "-c:a aac",
        "-shortest", "-pix_fmt yuv420p",
      ])
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", reject)
      .run();
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  log("=== Dragon Delivery Service — Full Rebuild (8 scenes) ===\n");

  // Verify images exist
  for (const sc of SCENES) {
    if (!fs.existsSync(sc.start)) throw new Error(`Missing: ${sc.start}`);
    if (!fs.existsSync(sc.end))   throw new Error(`Missing: ${sc.end}`);
  }
  log("All scene images present.\n");

  // Step 1 — render all scene clips
  log("Step 1: Rendering scene clips...");
  const clipPaths = [];
  for (let i = 0; i < SCENES.length; i++) {
    const sc = SCENES[i];
    const clipPath = path.join(REEL_DIR, `scene-${sc.n}-clip.mp4`);
    log(`  Scene ${sc.n}/${SCENES.length}...`);
    // Force re-render scene 1 since its clip was 0 bytes
    await renderSceneClip(sc.start, sc.end, NARRATIONS[i], sc.dur, clipPath, sc.n === 1);
    clipPaths.push(clipPath);
    log(`  Scene ${sc.n} done.`);
  }

  // Step 2 — synthesize narration (use existing narration-v2.mp3 if available)
  const narrationPath = path.join(REEL_DIR, "narration-v2.mp3");
  if (!fs.existsSync(narrationPath)) {
    log("\nStep 2: Synthesizing narration...");
    const buf = await synthesizeNarration(NARRATIONS);
    fs.writeFileSync(narrationPath, buf);
    log(`  Saved ${buf.length} bytes → narration-v2.mp3`);
  } else {
    log("\nStep 2: narration-v2.mp3 already exists, reusing.");
  }

  // Step 3 — assemble final video
  const finalPath = path.join(REEL_DIR, "output.mp4");
  log("\nStep 3: Assembling final video...");
  await assembleFinal(clipPaths, narrationPath, finalPath);
  log("  output.mp4 assembled.");

  // Step 4 — verify
  const stat = fs.statSync(finalPath);
  log(`\nStep 4: output.mp4 = ${(stat.size / 1024).toFixed(1)} KB`);

  // Step 5 — update featured-combined.mp4
  fs.copyFileSync(finalPath, FEATURED);
  log("Step 5: featured-combined.mp4 updated.");

  log("\n=== DONE! All 8 scenes assembled. ===");
  log("Restart the backend and hard-refresh the homepage (Ctrl+Shift+R).");
}

main().catch(err => {
  console.error("\nFAILED:", err.message || err);
  process.exit(1);
});

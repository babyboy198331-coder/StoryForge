/**
 * Adds scenes 9 & 10 to Dragon Delivery Service (7a9093c3).
 * Scene 9: Ember opens the package — reveals a golden compass
 * Scene 10: Ember launches into the dawn sky, new adventure begins
 *
 * Run: node add-scenes-9-10.mjs
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

const REEL_ID   = "7a9093c3-ca3f-42c4-8278-0fd4f0ccfdd7";
const REEL_DIR  = path.join(__dirname, "storage", REEL_ID);
const FEED_PATH = path.join(__dirname, "storage", "feed.json");
const FEATURED  = path.join(__dirname, "storage", "featured-combined.mp4");
const CAPTION_FONT = "C:/Windows/Fonts/arialbd.ttf";
const OUTPUT_FPS   = 30;

const EMBER = "Ember, a small 5-year-old dragon with scales shimmering in shades of orange and red, short spiky hair, slender build, wearing a tiny brown leather backpack, and a distinctive scar above her left eyebrow";

const NEW_SCENES = [
  {
    n: 9,
    dur: 9,
    narration: "With trembling claws, Ember opens the package. Inside, a golden compass pulses with warm light — and a tucked note that reads: the kingdom needs its bravest courier. This was no ordinary delivery. This was a calling.",
    visual: "Ember crouches at her doorstep, clawed hands carefully opening the mysterious package to reveal a glowing golden compass inside",
    camera: "Close-up push-in on the open package, Ember's wide eyes reflecting golden light",
    imgStartPrompt: `Fantasy adventure comic art, close-up shot of ${EMBER} kneeling at her stone doorstep at pre-dawn, carefully prying open a mysterious package with glowing runes, blue magical light spilling from the opening seam, her face lit with anticipation, bold ink outlines, halftone texture, dynamic comic shading, 9:16 vertical panel composition`,
    imgEndPrompt: `Fantasy adventure comic art, close-up insert shot of the open mysterious package revealing a golden compass inside, pulsing with warm golden light, ancient symbols etched around its face, ${EMBER}'s small orange clawed hands cradling it, wonder in her wide eyes reflecting the glow, bold ink outlines, screentone texture, 9:16 vertical panel composition`,
    imgStartSeed: 9001,
    imgEndSeed: 9002,
  },
  {
    n: 10,
    dur: 10,
    narration: "Ember straps the compass to her chest, takes a deep breath, and leaps into the golden dawn. Wings wide, heart full — because that is what dragon couriers do. They always make the delivery.",
    visual: "Ember spreads her wings on a rooftop at sunrise and launches into the sky, soaring high above the kingdom with the golden compass glowing on her chest",
    camera: "Wide aerial shot pulling back as Ember soars upward into the glowing dawn sky above the kingdom",
    imgStartPrompt: `Fantasy adventure comic art, wide shot of ${EMBER} standing on the edge of a rooftop at golden sunrise, wings beginning to spread dramatically against an orange and purple dawn sky, golden compass glowing on her chest, heroic pose, warm golden backlighting, bold ink outlines, halftone texture, dynamic comic shading, 9:16 vertical panel composition`,
    imgEndPrompt: `Fantasy adventure comic art, epic aerial wide shot of ${EMBER} soaring high above a sprawling magical kingdom at sunrise, wings fully extended, golden compass glowing on her chest, kingdom rendered small below her, vast orange and gold sky, sense of freedom and destiny, bold ink outlines, screentone texture, 9:16 vertical panel composition`,
    imgStartSeed: 10001,
    imgEndSeed: 10002,
  },
];

// All 10 scene narrations (1-8 already exist in video; used for new audio track)
const ALL_NARRATIONS = [
  "In a magical kingdom, where dragons and magic are a part of everyday life, meet Ember, the youngest member of the Dragon Delivery Service.",
  "With her keen sense of direction and agility, Ember navigates the kingdom, delivering packages to even the most remote locations.",
  "From the bustling markets of Willowdale to the snow-capped mountains of Frostbite Peak, Ember's deliveries bring joy and excitement to the people of the kingdom.",
  "With a keen sense of responsibility, Ember carefully collects and delivers each package, earning the trust of her clients.",
  "Even in the most challenging weather conditions, Ember perseveres, determined to complete her deliveries.",
  "After a long day of flying and delivering, Ember returns home to the warm welcome of her fellow dragons.",
  "As the sun sets on another successful day, Ember reflects on the joy and purpose she finds in her work as a dragon courier.",
  "But one morning, long before the kingdom stirs, Ember discovers a mysterious package at her door — sealed with ancient runes and glowing with magic she has never seen before. Only she can uncover its secret. And so the adventure truly begins.",
  "With trembling claws, Ember opens the package. Inside, a golden compass pulses with warm light — and a tucked note that reads: the kingdom needs its bravest courier. This was no ordinary delivery. This was a calling.",
  "Ember straps the compass to her chest, takes a deep breath, and leaps into the golden dawn. Wings wide, heart full — because that is what dragon couriers do. They always make the delivery.",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function log(msg) { console.log(msg); }

async function downloadImage(prompt, seed, destPath) {
  if (fs.existsSync(destPath) && fs.statSync(destPath).size > 5000) {
    log(`  [skip] ${path.basename(destPath)} already exists`);
    return;
  }
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1080&height=1920&nologo=true&seed=${seed}`;
  log(`  Fetching seed=${seed}...`);
  const res = await fetch(url, { timeout: 60000 });
  if (!res.ok) throw new Error(`Image fetch failed: ${res.status}`);
  const buf = await res.buffer();
  if (buf.length < 5000) throw new Error(`Tiny response (${buf.length} bytes) — may be error page`);
  fs.writeFileSync(destPath, buf);
  log(`  Saved ${buf.length} bytes → ${path.basename(destPath)}`);
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
  return lines.join("\\n").replace(/\\/g, "\\\\").replace(/'/g, "'\\''");
}

function renderClip(startImg, endImg, narration, duration, outputPath) {
  if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1000) {
    log(`  [skip] ${path.basename(outputPath)} already exists`);
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const half = duration / 2;
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
      .on("end", () => resolve())
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

function assembleAll(clipPaths, narrationPath, outputPath) {
  return new Promise((resolve, reject) => {
    const cmd = ffmpeg();
    for (const p of clipPaths) cmd.input(p);
    cmd.input(narrationPath);

    const n = clipPaths.length;
    const concatInputs = clipPaths.map((_, i) => `[${i}:v]`).join("");
    const filterStr = `${concatInputs}concat=n=${n}:v=1:a=0[outv]`;

    cmd
      .complexFilter([filterStr])
      .outputOptions([
        "-map [outv]", `-map ${n}:a`,
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
  log("=== Dragon Delivery Service — Adding Scenes 9 & 10 ===\n");

  // Step 1 — download new images
  log("Step 1: Downloading images for scenes 9 & 10...");
  for (const sc of NEW_SCENES) {
    log(`  Scene ${sc.n} start image:`);
    await downloadImage(sc.imgStartPrompt, sc.imgStartSeed, path.join(REEL_DIR, `scene-${sc.n}-start.jpg`));
    log(`  Scene ${sc.n} end image:`);
    await downloadImage(sc.imgEndPrompt,   sc.imgEndSeed,   path.join(REEL_DIR, `scene-${sc.n}-end.jpg`));
  }

  // Step 2 — render new scene clips
  log("\nStep 2: Rendering scene clips for 9 & 10...");
  for (const sc of NEW_SCENES) {
    log(`  Scene ${sc.n}...`);
    await renderClip(
      path.join(REEL_DIR, `scene-${sc.n}-start.jpg`),
      path.join(REEL_DIR, `scene-${sc.n}-end.jpg`),
      sc.narration,
      sc.dur,
      path.join(REEL_DIR, `scene-${sc.n}-clip.mp4`),
    );
    log(`  Scene ${sc.n} done.`);
  }

  // Step 3 — synthesize full 10-scene narration
  const narrationPath = path.join(REEL_DIR, "narration-v3.mp3");
  if (!fs.existsSync(narrationPath)) {
    log("\nStep 3: Synthesizing 10-scene narration...");
    const buf = await synthesizeNarration(ALL_NARRATIONS);
    fs.writeFileSync(narrationPath, buf);
    log(`  Saved ${buf.length} bytes → narration-v3.mp3`);
  } else {
    log("\nStep 3: narration-v3.mp3 already exists, reusing.");
  }

  // Step 4 — assemble all 10 scenes
  log("\nStep 4: Assembling 10-scene video...");
  const clipPaths = [];
  for (let i = 1; i <= 10; i++) {
    const p = path.join(REEL_DIR, `scene-${i}-clip.mp4`);
    if (!fs.existsSync(p) || fs.statSync(p).size < 1000) throw new Error(`Missing/empty: scene-${i}-clip.mp4`);
    clipPaths.push(p);
  }

  const finalPath = path.join(REEL_DIR, "output.mp4");
  await assembleAll(clipPaths, narrationPath, finalPath);
  const stat = fs.statSync(finalPath);
  log(`  output.mp4 = ${(stat.size / 1024).toFixed(1)} KB`);

  // Step 5 — update featured-combined.mp4
  fs.copyFileSync(finalPath, FEATURED);
  log("\nStep 5: featured-combined.mp4 updated.");

  // Step 6 — update feed.json
  log("\nStep 6: Updating feed.json...");
  const feed = JSON.parse(fs.readFileSync(FEED_PATH, "utf8"));
  const reel = feed.find(r => r.id === REEL_ID);
  if (!reel) throw new Error("Reel not found in feed.json");

  for (const sc of NEW_SCENES) {
    if (!reel.scenes.find(s => s.scene === sc.n)) {
      reel.scenes.push({
        scene: sc.n,
        visual: sc.visual,
        narration: sc.narration,
        camera: sc.camera,
        duration_seconds: sc.dur,
        characters_present: ["Ember"],
        imageUrlStart: `https://image.pollinations.ai/prompt/${encodeURIComponent(sc.imgStartPrompt)}?width=1080&height=1920&nologo=true&seed=${sc.imgStartSeed}`,
        imageUrlEnd:   `https://image.pollinations.ai/prompt/${encodeURIComponent(sc.imgEndPrompt)}?width=1080&height=1920&nologo=true&seed=${sc.imgEndSeed}`,
      });
      log(`  Scene ${sc.n} added to feed.json.`);
    } else {
      log(`  Scene ${sc.n} already in feed.json.`);
    }
  }
  // Update ending
  reel.ending = "Ember soars into the dawn sky with a golden compass on her chest, ready for her greatest adventure yet";
  fs.writeFileSync(FEED_PATH, JSON.stringify(feed, null, 2));

  log("\n=== DONE! Dragon Delivery Service now has 10 scenes. ===");
  log("Hard-refresh the homepage (Ctrl+Shift+R) to see the full reel.");
}

main().catch(err => {
  console.error("\nFAILED:", err.message || err);
  process.exit(1);
});

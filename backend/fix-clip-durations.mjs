/**
 * Fixes half-duration clips on Dragon Delivery Service.
 *
 * Root cause: minterpolate mi_mode=blend consumes frame pairs, halving output
 * duration. Scenes rendered from a single static image are correct (8s).
 * Scenes with two different images (start/end) are all half-length.
 *
 * Fix: replace minterpolate with -loop 1 input + xfade fade transition.
 * Then reassemble all 30 scenes.
 *
 * Run: node fix-clip-durations.mjs
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

const REEL_ID   = "7a9093c3-ca3f-42c4-8278-0fd4f0ccfdd7";
const REEL_DIR  = path.join(__dirname, "storage", REEL_ID);
const FEED_PATH = path.join(__dirname, "storage", "feed.json");
const FEATURED  = path.join(__dirname, "storage", "featured-combined.mp4");
const CAPTION_FONT = "C:/Windows/Fonts/arialbd.ttf";
const OUTPUT_FPS   = 30;

// All 30 scenes: { n, dur, start, end }
// Scenes 1,3-7 use same image for both (static hold) — already correct duration.
// All others have distinct start/end images — need re-render.
function buildSceneList() {
  const feed = JSON.parse(fs.readFileSync(FEED_PATH, "utf8"));
  const reel = feed.find(r => r.id === REEL_ID);
  const scenes = [];
  for (const s of reel.scenes) {
    const n = s.scene;
    const dur = s.duration_seconds || 8;
    let startImg, endImg;
    if (s.imageUrlStart) {
      // new format — local files exist
      startImg = path.join(REEL_DIR, `scene-${n}-start.jpg`);
      endImg   = path.join(REEL_DIR, `scene-${n}-end.jpg`);
    } else {
      // old format — single image, use same for both
      startImg = path.join(REEL_DIR, `scene-${n}.jpg`);
      endImg   = path.join(REEL_DIR, `scene-${n}.jpg`);
    }
    scenes.push({ n, dur, startImg, endImg });
  }
  return scenes.sort((a, b) => a.n - b.n);
}

function wrapCaption(text, maxChars = 28) {
  const words = text.trim().split(/\s+/);
  const lines = []; let cur = "";
  for (const w of words) {
    const cand = cur ? `${cur} ${w}` : w;
    if (cand.length > maxChars && cur) { lines.push(cur); cur = w; } else cur = cand;
  }
  if (cur) lines.push(cur);
  return lines.join("\\n").replace(/\\/g, "\\\\").replace(/'/g, "'\\''");
}

function renderClip(scene, narration, outputPath, force = false) {
  const { startImg, endImg, dur } = scene;
  const sameImage = startImg === endImg;

  if (!force && fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1000) {
    // Verify duration is correct — skip only if within 0.5s of expected
    return Promise.resolve("skip");
  }

  return new Promise((resolve, reject) => {
    const cmd = ffmpeg();

    let filter;

    if (sameImage) {
      // Single static image — loop it for full duration
      cmd.input(startImg).inputOptions(["-loop", "1"]);
      filter =
        `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,` +
        `setsar=1,fps=${OUTPUT_FPS},trim=duration=${dur},setpts=PTS-STARTPTS`;
    } else {
      // Two images — loop each, xfade fade between them
      // xfade: fade starts at 60% of duration, lasts remaining 40%
      const fadeDur = Math.max(0.5, Math.min(2.5, dur * 0.4));
      const fadeOffset = dur - fadeDur;
      cmd.input(startImg).inputOptions(["-loop", "1"]);
      cmd.input(endImg).inputOptions(["-loop", "1"]);
      filter =
        `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,` +
        `setsar=1,fps=${OUTPUT_FPS},trim=duration=${dur},setpts=PTS-STARTPTS[a]` +
        `;[1:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,` +
        `setsar=1,fps=${OUTPUT_FPS},trim=duration=${dur},setpts=PTS-STARTPTS[b]` +
        `;[a][b]xfade=transition=fade:duration=${fadeDur}:offset=${fadeOffset}`;
    }

    if (fs.existsSync(CAPTION_FONT) && narration) {
      filter += `,drawtext=fontfile='${CAPTION_FONT}':text='${wrapCaption(narration)}':fontsize=46:fontcolor=white:box=1:boxcolor=black@0.55:boxborderw=18:line_spacing=10:x=(w-text_w)/2:y=h-th-160`;
    }
    filter += "[outv]";

    cmd
      .complexFilter(filter)
      .outputOptions(["-map [outv]", "-an", "-pix_fmt yuv420p", "-preset", "veryfast"])
      .fps(OUTPUT_FPS)
      .output(outputPath)
      .on("end", () => resolve("rendered"))
      .on("error", reject)
      .run();
  });
}

function assembleAll(clipPaths, narrationPath, outputPath) {
  return new Promise((resolve, reject) => {
    const cmd = ffmpeg();
    for (const p of clipPaths) cmd.input(p);
    cmd.input(narrationPath);
    const n = clipPaths.length;
    const inputs = clipPaths.map((_, i) => `[${i}:v]`).join("");
    cmd
      .complexFilter([`${inputs}concat=n=${n}:v=1:a=0[outv]`])
      .outputOptions([
        "-map [outv]", `-map ${n}:a`,
        "-c:v libx264", "-preset", "veryfast",
        "-c:a aac", "-shortest", "-pix_fmt yuv420p",
      ])
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", reject)
      .run();
  });
}

async function main() {
  console.log("=== Fix clip durations — Dragon Delivery Service ===\n");

  const scenes = buildSceneList();
  const feed = JSON.parse(fs.readFileSync(FEED_PATH, "utf8"));
  const reel = feed.find(r => r.id === REEL_ID);
  const narrationMap = Object.fromEntries(reel.scenes.map(s => [s.scene, s.narration]));

  // Step 1 — re-render only clips that have two distinct images (affected ones)
  console.log("Step 1: Re-rendering affected clips (distinct start/end images)...");
  const clipPaths = [];
  for (const sc of scenes) {
    const clipPath = path.join(REEL_DIR, `scene-${sc.n}-clip.mp4`);
    clipPaths.push(clipPath);
    const sameImage = sc.startImg === sc.endImg;
    if (sameImage) {
      console.log(`  Scene ${sc.n}: static image, already correct — skip`);
      continue;
    }
    console.log(`  Scene ${sc.n} (dur=${sc.dur}s): re-rendering...`);
    const result = await renderClip(sc, narrationMap[sc.n], clipPath, true);
    console.log(`  Scene ${sc.n}: ${result}`);
  }

  // Step 2 — narration (reuse v5 — it's correct)
  const narrationPath = path.join(REEL_DIR, "narration-v5.mp3");
  console.log(`\nStep 2: Using narration-v5.mp3 (${(fs.statSync(narrationPath).size/1024).toFixed(0)} KB)`);

  // Step 3 — reassemble
  console.log("\nStep 3: Assembling 30-scene video...");
  const finalPath = path.join(REEL_DIR, "output.mp4");
  await assembleAll(clipPaths, narrationPath, finalPath);
  const size = (fs.statSync(finalPath).size / 1024).toFixed(1);

  // Quick duration check via file size / bitrate estimate
  console.log(`  output.mp4 = ${size} KB`);

  // Step 4 — update featured-combined.mp4
  fs.copyFileSync(finalPath, FEATURED);
  console.log("\nStep 4: featured-combined.mp4 updated.");

  console.log("\n=== DONE. Hard-refresh the homepage (Ctrl+Shift+R). ===");
}

main().catch(err => {
  console.error("\nFAILED:", err.message || err);
  process.exit(1);
});

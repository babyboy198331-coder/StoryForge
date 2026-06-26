/**
 * Rebuilds every reel except Dragon Delivery Service.
 *
 * Per reel:
 *  1. Renders each scene clip using xfade (start/end images) or static hold
 *  2. Generates narration via Edge TTS if narration text exists in feed.json,
 *     else uses existing narration.wav/mp3 on disk, else assembles silent
 *  3. Concatenates clips + audio into a new output.mp4
 *
 * Run: node rebuild-all-reels.mjs
 * Safe to re-run — already-correct clips are skipped.
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

const MUSIC_VOLUME = 0.18;

function pickMusicTrack() {
  const dir = process.env.MUSIC_DIR;
  if (!dir || !fs.existsSync(dir)) return null;
  const exts = [".mp3", ".wav", ".m4a", ".ogg"];
  const files = fs.readdirSync(dir).filter(f => exts.includes(path.extname(f).toLowerCase()));
  if (!files.length) return null;
  return path.join(dir, files[Math.floor(Math.random() * files.length)]);
}

const STORAGE_DIR  = path.join(__dirname, "storage");
const FEED_PATH    = path.join(STORAGE_DIR, "feed.json");
const SKIP_ID      = "7a9093c3-ca3f-42c4-8278-0fd4f0ccfdd7"; // Dragon Delivery Service
const CAPTION_FONT = "C:/Windows/Fonts/arialbd.ttf";
const OUTPUT_FPS   = 30;

// ── Helpers ───────────────────────────────────────────────────────────────────

function log(msg) { process.stdout.write(msg + "\n"); }

function wrapCaption(text, maxChars = 28) {
  if (!text) return "";
  const words = text.trim().split(/\s+/);
  const lines = []; let cur = "";
  for (const w of words) {
    const cand = cur ? `${cur} ${w}` : w;
    if (cand.length > maxChars && cur) { lines.push(cur); cur = w; } else cur = cand;
  }
  if (cur) lines.push(cur);
  return lines.join("\\n").replace(/\\/g, "\\\\").replace(/'/g, "'\\''");
}

function renderClip(startImg, endImg, narration, duration, outputPath) {
  if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 5000) {
    return Promise.resolve("skip");
  }
  return new Promise((resolve, reject) => {
    const same = startImg === endImg;
    const cmd = ffmpeg();
    let filter;

    if (same) {
      cmd.input(startImg).inputOptions(["-loop", "1"]);
      filter =
        `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,` +
        `setsar=1,fps=${OUTPUT_FPS},trim=duration=${duration},setpts=PTS-STARTPTS`;
    } else {
      const fadeDur = Math.max(0.5, Math.min(2.5, duration * 0.4));
      const fadeOff = duration - fadeDur;
      cmd.input(startImg).inputOptions(["-loop", "1"]);
      cmd.input(endImg).inputOptions(["-loop", "1"]);
      filter =
        `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,` +
        `setsar=1,fps=${OUTPUT_FPS},trim=duration=${duration},setpts=PTS-STARTPTS[a]` +
        `;[1:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,` +
        `setsar=1,fps=${OUTPUT_FPS},trim=duration=${duration},setpts=PTS-STARTPTS[b]` +
        `;[a][b]xfade=transition=fade:duration=${fadeDur}:offset=${fadeOff}`;
    }

    if (fs.existsSync(CAPTION_FONT) && narration) {
      filter += `,drawtext=fontfile='${CAPTION_FONT}':text='${wrapCaption(narration)}':fontsize=46:fontcolor=white:box=1:boxcolor=black@0.55:boxborderw=18:line_spacing=10:x=(w-text_w)/2:y=h-th-160`;
    }
    filter += "[outv]";

    cmd.complexFilter(filter)
      .outputOptions(["-map [outv]", "-an", "-pix_fmt yuv420p", "-preset", "veryfast"])
      .fps(OUTPUT_FPS).output(outputPath)
      .on("end", () => resolve("rendered"))
      .on("error", reject)
      .run();
  });
}

async function synthesizeNarration(texts, gender = "female") {
  const text = texts.filter(Boolean).join(" ").trim();
  if (!text) return null;
  const voice = gender === "male" ? "en-US-GuyNeural" : "en-US-AriaNeural";
  const tmpDir = path.join(os.tmpdir(), `edge-tts-${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  try {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioFilePath } = await tts.toFile(tmpDir, text);
    return fs.readFileSync(audioFilePath);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

function assembleVideo(clipPaths, narrationPath, outputPath, totalDuration) {
  return new Promise((resolve, reject) => {
    const cmd = ffmpeg();
    for (const p of clipPaths) cmd.input(p);

    const n = clipPaths.length;
    const inputs = clipPaths.map((_, i) => `[${i}:v]`).join("");

    const hasNarration = Boolean(narrationPath && fs.existsSync(narrationPath));
    const musicPath = pickMusicTrack();
    const hasMusic = Boolean(musicPath && fs.existsSync(musicPath));

    if (hasNarration) cmd.input(narrationPath);
    // Loop music so it covers the full video regardless of track length
    if (hasMusic) cmd.input(musicPath).inputOptions(["-stream_loop", "-1"]);

    const videoConcat = `${inputs}concat=n=${n}:v=1:a=0[outv]`;
    const filters = [videoConcat];

    // Audio mixing: narration at full volume + music bed at low volume,
    // padded with silence so the audio always reaches the end of the video.
    if (hasNarration && hasMusic) {
      const narIdx = n, musIdx = n + 1;
      filters.push(
        `[${narIdx}:a]apad[narpad]`,
        `[${musIdx}:a]volume=${MUSIC_VOLUME}[musicvol]`,
        `[narpad][musicvol]amix=inputs=2:duration=longest[aout]`
      );
    } else if (hasNarration) {
      filters.push(`[${n}:a]apad[aout]`);
    } else if (hasMusic) {
      filters.push(`[${n}:a]volume=${MUSIC_VOLUME}[aout]`);
    }

    cmd.complexFilter(filters);

    const outOpts = ["-map [outv]", "-c:v libx264", "-preset veryfast", "-pix_fmt yuv420p"];
    if (hasNarration || hasMusic) outOpts.push("-map [aout]", "-c:a aac");
    // Clamp to total video duration so looped music/padded silence don't
    // run past the last frame.
    if (totalDuration) outOpts.push("-t", String(totalDuration));

    cmd.outputOptions(outOpts)
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", reject)
      .run();
  });
}

function resolveImages(reelDir, sceneNum) {
  const startP = path.join(reelDir, `scene-${sceneNum}-start.jpg`);
  const endP   = path.join(reelDir, `scene-${sceneNum}-end.jpg`);
  const legP   = path.join(reelDir, `scene-${sceneNum}.jpg`);
  if (fs.existsSync(startP) && fs.existsSync(endP)) return [startP, endP];
  if (fs.existsSync(legP))  return [legP, legP];
  return null;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function rebuildReel(reel) {
  const reelDir = path.join(STORAGE_DIR, reel.id);
  const short   = reel.id.slice(0, 8);
  log(`\n── ${reel.title} (${short}) ──`);

  const scenes = [...reel.scenes].sort((a, b) => a.scene - b.scene);

  // Step 1: render scene clips
  const clipPaths = [];
  let anyRendered = false;
  for (const sc of scenes) {
    const imgs = resolveImages(reelDir, sc.scene);
    if (!imgs) { log(`  scene ${sc.scene}: no images found, skipping`); continue; }
    const clipPath = path.join(reelDir, `scene-${sc.scene}-clip.mp4`);
    const dur = sc.duration_seconds || 8;
    const result = await renderClip(imgs[0], imgs[1], sc.narration || "", dur, clipPath);
    if (result !== "skip") anyRendered = true;
    log(`  scene ${sc.scene}: ${result}`);
    clipPaths.push(clipPath);
  }

  if (!clipPaths.length) { log(`  No clips — skipping assembly`); return; }

  // Step 2: narration
  let narrationPath = null;
  const narTexts = scenes.map(s => s.narration).filter(Boolean);

  if (narTexts.length > 0) {
    const narOut = path.join(reelDir, "narration-rebuilt.mp3");
    if (!fs.existsSync(narOut) || anyRendered) {
      log(`  Synthesizing narration (${narTexts.length} scenes)...`);
      const gender = reel.narrator_gender || "female";
      const buf = await synthesizeNarration(narTexts, gender);
      if (buf) { fs.writeFileSync(narOut, buf); narrationPath = narOut; log(`  narration: ${buf.length} bytes`); }
    } else {
      narrationPath = narOut;
      log(`  narration: reusing rebuilt mp3`);
    }
  } else {
    // No text — try existing audio files on disk
    const mp3 = path.join(reelDir, "narration.mp3");
    const wav = path.join(reelDir, "narration.wav");
    if (fs.existsSync(mp3)) { narrationPath = mp3; log(`  narration: using existing mp3`); }
    else if (fs.existsSync(wav)) { narrationPath = wav; log(`  narration: using existing wav`); }
    else { log(`  narration: none available — assembling silent`); }
  }

  // Step 3: assemble
  const totalDuration = scenes.reduce((sum, sc) => sum + (sc.duration_seconds || 8), 0);
  const outputPath = path.join(reelDir, "output.mp4");
  log(`  Assembling ${clipPaths.length} clips (${totalDuration}s)...`);
  await assembleVideo(clipPaths, narrationPath, outputPath, totalDuration);
  const kb = (fs.statSync(outputPath).size / 1024).toFixed(0);
  log(`  output.mp4 = ${kb} KB ✓`);
}

async function main() {
  log("=== Rebuild All Reels ===");
  const feed = JSON.parse(fs.readFileSync(FEED_PATH, "utf8"));
  const reels = feed.filter(r => r.id !== SKIP_ID);
  log(`Processing ${reels.length} reels (skipping Dragon Delivery Service)...\n`);

  for (const reel of reels) {
    try {
      await rebuildReel(reel);
    } catch (err) {
      log(`  ERROR: ${err.message}`);
    }
  }

  log("\n=== Done. Restart the backend and hard-refresh. ===");
}

main().catch(err => { console.error("FATAL:", err); process.exit(1); });

import ffmpegPath from "ffmpeg-static";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import os from "os";
import { execFileSync } from "child_process";

ffmpeg.setFfmpegPath(ffmpegPath);

const OUTPUT_FPS = 30;

// Not every platform build of ffmpeg-static ships with "minterpolate" - the
// Linux binaries pulled in by ffmpeg-static's installer are a smaller build
// than e.g. the Windows gyan.dev "essentials" build, and have been known to
// drop it. Rather than find this out mid-render (ffmpeg fails the whole
// complexFilter with "Filter not found" and the scene clip never gets
// written), check once at startup and fall back to a filter chain that's
// part of every ffmpeg build, so a render degrades gracefully instead of
// failing outright on hosts (e.g. Railway/Docker) with a stripped binary.
const HAS_MINTERPOLATE = (() => {
  try {
    const filters = execFileSync(ffmpegPath, ["-filters"], { encoding: "utf8" });
    return /\bminterpolate\b/.test(filters);
  } catch (err) {
    console.warn(`Could not query ffmpeg filters (${err.message}); assuming no minterpolate.`);
    return false;
  }
})();
if (!HAS_MINTERPOLATE) {
  console.warn(
    "ffmpeg build has no 'minterpolate' filter - falling back to tblend-based " +
      "crossfade for scene motion (no true motion-compensated interpolation)."
  );
}

// Burned-in captions: free, since the narration text already exists from
// Groq. Skipped automatically if the font file isn't found, so this never
// breaks generation on a machine without it.
//
// Defaults to a bundled DejaVu Sans Bold (backend/fonts/) rather than a
// Windows-only system path - the old default of C:/Windows/Fonts/arialbd.ttf
// silently disabled captions on every non-Windows deploy target (Railway,
// any Linux/Mac host), since that path never exists there.
const CAPTION_FONT_RAW =
  process.env.CAPTION_FONT_PATH || path.join(process.cwd(), "fonts", "DejaVuSans-Bold.ttf");
// ffmpeg's drawtext filter treats backslashes as escape characters, so a
// Windows-style path (e.g. from path.join on Windows) breaks the filter
// string. Forward slashes work fine in ffmpeg paths on every OS.
const CAPTION_FONT = CAPTION_FONT_RAW.replace(/\\/g, "/");
const CAPTIONS_ENABLED = fs.existsSync(CAPTION_FONT_RAW);
if (!CAPTIONS_ENABLED) {
  console.warn(`Caption font not found at ${CAPTION_FONT_RAW} - captions will be disabled.`);
}

// Background music: free, optional. Looks for a random track in MUSIC_DIR.
// Mixed in quietly under narration, or used alone in caption-only mode.
const MUSIC_VOLUME = Number(process.env.MUSIC_VOLUME || 0.18);

// Motion interpolation mode for the start/end still pair per scene:
// "mci" = real motion-compensated interpolation (estimates motion vectors
//   and warps between the two images - looks like actual movement, but is
//   noticeably heavier on the CPU).
// "blend" = cheap frame-blend/crossfade between the two stills - much
//   faster, looks more like a soft dissolve than movement.
// Lower-end machines that struggled with other CPU-heavy steps in this
// pipeline should set MOTION_INTERPOLATION_MODE=blend in .env.
const MI_MODE = process.env.MOTION_INTERPOLATION_MODE || "mci";

// Wraps text to multiple lines and escapes it for safe use inside a
// single-quoted ffmpeg drawtext value (only \ and ' need escaping there -
// colons and commas are fine since the quotes protect them).
function wrapAndEscapeCaption(text, maxCharsPerLine = 28) {
  if (!text) return "";
  const words = text.trim().split(/\s+/);
  const lines = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxCharsPerLine && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);

  return lines
    .map((line) =>
      line
        .replace(/\\/g, "\\\\")
        // A literal ' can't be escaped with a backslash inside a single-quoted
        // ffmpeg filter value - it has to close the quote, insert an escaped
        // quote, then reopen the quote: '\''
        .replace(/'/g, "'\\''")
    )
    .join("\\n");
}

// Where a given scene's rendered (silent, caption-burned) clip lives on
// disk. Deterministic from workDir + scene number, same idea as the
// scene-N-start.jpg/-end.jpg stills, so it can always be located again
// without having to keep it in memory or in feed.json.
export function sceneClipPath(workDir, sceneNumber) {
  return path.join(workDir, `scene-${sceneNumber}-clip.mp4`);
}

// Renders ONE scene's two stills (start/end pose) into its own short,
// silent, caption-burned MP4 clip. This is the expensive step (the
// motion-interpolation filter is CPU-heavy) - splitting it out per scene
// means regenerating a single scene later only has to pay this cost once,
// for that one scene, instead of re-running it across every scene in the
// reel just to change one of them.
export function renderSceneClip({ scene, outputPath, motionMode = MI_MODE }) {
  return new Promise((resolve, reject) => {
    const duration = scene.duration_seconds || 6;
    const halfDuration = Math.max(0.05, duration / 2);

    const command = ffmpeg();
    command.input(scene.imagePathStart).loop(halfDuration);
    command.input(scene.imagePathEnd).loop(halfDuration);

    // "mci" (motion-compensated interpolation) looks like real movement but
    // is CPU-heavy - the obmc/bidir/vsbmc options only apply to that mode.
    // "blend" is a cheap crossfade: much faster, used for scene regenerate
    // so a single-scene edit doesn't make someone wait 15+ seconds.
    // tblend=average + framerate is the fallback: it blends adjacent frames
    // into a soft crossfade, the same effect "blend" mode gets from
    // minterpolate, just without true motion-compensated warping. Used for
    // BOTH modes when minterpolate is unavailable, since "mci" has no other
    // equivalent in a build that lacks the filter entirely.
    const motionFilter = !HAS_MINTERPOLATE
      ? `tblend=all_mode=average,framerate=fps=${OUTPUT_FPS}`
      : motionMode === "blend"
        ? `minterpolate=fps=${OUTPUT_FPS}:mi_mode=blend`
        : `minterpolate=fps=${OUTPUT_FPS}:mi_mode=${motionMode}:mc_mode=obmc:me_mode=bidir:vsbmc=1`;

    let complexFilter =
      `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,` +
      `setsar=1,trim=duration=${halfDuration},fps=25[a]` +
      `;[1:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,` +
      `setsar=1,trim=duration=${halfDuration},fps=25[b]` +
      `;[a][b]concat=n=2:v=1:a=0[pre]` +
      `;[pre]${motionFilter},` +
      `trim=duration=${duration},setsar=1`;

    if (CAPTIONS_ENABLED && scene.narration) {
      const caption = wrapAndEscapeCaption(scene.narration);
      complexFilter +=
        `,drawtext=fontfile='${CAPTION_FONT}':text='${caption}':fontsize=46:fontcolor=white:` +
        `box=1:boxcolor=black@0.55:boxborderw=18:line_spacing=10:` +
        `x=(w-text_w)/2:y=h-th-160`;
    }

    complexFilter += `[outv]`;

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    command
      .complexFilter(complexFilter)
      .outputOptions(["-map [outv]", "-an", "-pix_fmt yuv420p", "-preset", "veryfast"])
      .fps(OUTPUT_FPS)
      .output(outputPath)
      .on("end", () => resolve(outputPath))
      .on("error", reject)
      .run();
  });
}

// Renders a scene's clip only if it doesn't already exist on disk - this is
// the actual "don't regenerate a video you already generated" behavior.
// Used both during initial generation (each scene renders once) and during
// single-scene regeneration (every OTHER scene's clip is reused as-is; only
// the target scene is force-rendered by the caller beforehand).
export async function ensureSceneClip({ scene, outputPath }) {
  if (fs.existsSync(outputPath)) return outputPath;
  return renderSceneClip({ scene, outputPath });
}

function escapeConcatPath(p) {
  // The concat demuxer's list file uses a small ini-like syntax where
  // backslashes and single quotes are special - forward slashes work fine
  // on Windows builds of ffmpeg too, so normalizing avoids ever having to
  // think about backslash-escaping here.
  return p.replace(/\\/g, "/").replace(/'/g, "'\\''");
}

// Stitches a sequence of already-rendered scene clips into the final
// vertical reel. Because every clip was encoded with identical settings
// (same resolution/fps/codec), the video stream itself is just concatenated
// with "-c:v copy" - no re-encoding, so this step is fast even for an 8-9
// scene reel. Narration audio and/or background music are mixed in on top
// and the result is trimmed to match ("-shortest").
export function concatVideoSegments({ segmentPaths, outputPath, narrationAudioPath, musicPath }) {
  return new Promise((resolve, reject) => {
    const listFile = path.join(
      os.tmpdir(),
      `storyforge-concat-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`
    );
    const listContents = segmentPaths
      .map((p) => `file '${escapeConcatPath(path.resolve(p))}'`)
      .join("\n");
    fs.writeFileSync(listFile, listContents);

    const command = ffmpeg();
    command.input(listFile).inputOptions(["-f", "concat", "-safe", "0"]);

    const hasNarration = Boolean(narrationAudioPath && fs.existsSync(narrationAudioPath));
    const hasMusic = Boolean(musicPath && fs.existsSync(musicPath));

    if (hasNarration) command.input(narrationAudioPath);
    if (hasMusic) command.input(musicPath).inputOptions(["-stream_loop", "-1"]);

    const outputOptions = ["-map 0:v", "-c:v copy", "-pix_fmt yuv420p"];

    let complexFilter = null;
    if (hasNarration && hasMusic) {
      complexFilter =
        `[2:a]volume=${MUSIC_VOLUME}[music]` +
        `;[1:a][music]amix=inputs=2:duration=first:dropout_transition=2[outa]`;
      outputOptions.push("-map [outa]", "-shortest");
    } else if (hasNarration) {
      outputOptions.push("-map 1:a", "-shortest");
    } else if (hasMusic) {
      complexFilter = `[1:a]volume=${MUSIC_VOLUME}[outa]`;
      outputOptions.push("-map [outa]", "-shortest");
    }

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    if (complexFilter) command.complexFilter(complexFilter);

    command
      .outputOptions(outputOptions)
      .output(outputPath)
      .on("end", () => {
        fs.rmSync(listFile, { force: true });
        resolve(outputPath);
      })
      .on("error", (err) => {
        fs.rmSync(listFile, { force: true });
        reject(err);
      })
      .run();
  });
}

// Full build: renders any scene clips that don't already exist (so calling
// this twice for the same reel doesn't redo finished scenes), then
// concatenates everything into the final MP4. This is what both initial
// generation and a "regenerate this scene" request call - the only
// difference is whether the target scene's clip was deleted/force-rendered
// before this runs.
export async function assembleVideo({ scenes, outputPath, narrationAudioPath, musicPath, workDir }) {
  const segmentPaths = [];
  for (const scene of scenes) {
    const clipPath = sceneClipPath(workDir, scene.scene);
    await ensureSceneClip({ scene, outputPath: clipPath });
    segmentPaths.push(clipPath);
  }

  return concatVideoSegments({ segmentPaths, outputPath, narrationAudioPath, musicPath });
}

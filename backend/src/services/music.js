import fs from "fs";
import path from "path";

const MUSIC_EXTENSIONS = [".mp3", ".wav", ".m4a", ".ogg"];

// Free, optional background music. Drop a few royalty-free tracks into the
// folder pointed to by MUSIC_DIR and one gets picked at random per reel. If
// MUSIC_DIR isn't set or is empty, returns null and the video just plays
// without a music bed (narration-only, or fully silent in caption-only mode).
export function pickMusicTrack() {
  const dir = process.env.MUSIC_DIR;
  if (!dir || !fs.existsSync(dir)) return null;

  const files = fs
    .readdirSync(dir)
    .filter((f) => MUSIC_EXTENSIONS.includes(path.extname(f).toLowerCase()));

  if (!files.length) return null;

  const pick = files[Math.floor(Math.random() * files.length)];
  return path.join(dir, pick);
}

import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import fs from "fs";
import os from "os";
import path from "path";

// Microsoft Edge's "Read Aloud" neural voices - the same engine used in
// Edge's accessibility feature, reachable for free with no API key, no
// local model files, and no local binary to crash. Swapped in after Piper's
// bundled onnxruntime build turned out to reliably crash
// (STATUS_STACK_BUFFER_OVERRUN) loading its ONNX model on this machine, and
// after Windows SAPI worked but sounded noticeably dated/robotic by
// comparison. This needs network access (a normal HTTPS/WebSocket call to
// Microsoft's service), unlike the fully offline Piper/SAPI paths.
const VOICE_FEMALE = process.env.EDGE_TTS_VOICE_FEMALE || "en-US-AriaNeural";
const VOICE_MALE = process.env.EDGE_TTS_VOICE_MALE || "en-US-GuyNeural";

function sanitizeForSpeech(text) {
  return text
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Pluggable narration via Microsoft Edge's free neural TTS. Returns a
// Buffer of MP3 audio, or null if synthesis fails/unavailable - the
// pipeline falls back to caption-only playback (no audio track) in that
// case, so the app still works end-to-end for free.
//
// Accepts either a single string or an array of per-scene narration
// strings (joined into one pass - this service has no issue with longer
// utterances, unlike Piper/espeak-ng).
export async function synthesizeNarration(textOrChunks, narratorGender = "female") {
  const text = sanitizeForSpeech(
    Array.isArray(textOrChunks) ? textOrChunks.join(" ") : textOrChunks || ""
  );
  if (!text) return null;

  const voice = (narratorGender || "").toLowerCase() === "male" ? VOICE_MALE : VOICE_FEMALE;

  const tmpDir = path.join(os.tmpdir(), `edge-tts-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  try {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioFilePath } = await tts.toFile(tmpDir, text);
    return fs.readFileSync(audioFilePath);
  } catch (err) {
    console.error("Edge TTS synthesis failed:", err.message);
    return null;
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  }
}

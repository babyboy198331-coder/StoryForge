"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startGenerateReel, getGenerationStatus } from "@/lib/api";

const GENRES = [
  "cinematic",
  "romance",
  "fantasy",
  "revenge",
  "horror",
  "comedy",
  "sci-fi",
  "alternate-history",
  "survival",
  "mystery",
  "space",
  "cyberpunk",
  "time-travel",
  "mythology",
  "post-apocalypse",
  "true-crime",
  "inspirational",
  "ai-stories",
  "what-if",
];

const POLL_INTERVAL_MS = 1500;

const STAGE_LABELS: Record<string, string> = {
  starting: "Starting up…",
  "writing script": "Writing script with Groq LLM…",
  "writing image prompts": "Crafting image prompts…",
  "finishing narration": "Synthesizing narration…",
  "assembling video": "Assembling video with FFmpeg…",
  done: "Done!",
};

export default function GeneratePage() {
  const [prompt, setPrompt] = useState("");
  const [genre, setGenre] = useState(GENRES[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<string | null>(null);
  const [sceneProgress, setSceneProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  function stopPolling() {
    if (pollTimer.current) {
      clearTimeout(pollTimer.current);
      pollTimer.current = null;
    }
  }

  async function poll(id: string) {
    try {
      const status = await getGenerationStatus(id);
      setStage(status.stage);
      setSceneProgress(
        status.totalScenes > 0
          ? { current: status.currentScene, total: status.totalScenes }
          : null
      );

      if (status.status === "done") {
        stopPolling();
        setLoading(false);
        router.push("/");
        router.refresh();
        return;
      }

      if (status.status === "error") {
        stopPolling();
        setLoading(false);
        setError(status.error || "Generation failed");
        return;
      }

      pollTimer.current = setTimeout(() => poll(id), POLL_INTERVAL_MS);
    } catch (e: any) {
      stopPolling();
      setLoading(false);
      setError(e.message || "Lost connection while checking progress");
    }
  }

  async function handleGenerate() {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    setStage("starting");
    setSceneProgress(null);
    try {
      const { id } = await startGenerateReel(prompt, genre);
      poll(id);
    } catch (e: any) {
      setLoading(false);
      setError(e.message || "Something went wrong");
    }
  }

  const progressPct = sceneProgress
    ? Math.round((sceneProgress.current / sceneProgress.total) * 100)
    : stage === "assembling video"
    ? 95
    : stage === "finishing narration"
    ? 88
    : stage === "writing image prompts"
    ? 12
    : stage === "writing script"
    ? 6
    : 3;

  const stageDisplay = stage
    ? STAGE_LABELS[stage] ??
      (sceneProgress
        ? `Generating scene art (${sceneProgress.current} / ${sceneProgress.total})…`
        : `${stage}…`)
    : null;

  return (
    <div className="generate-page">
      <Link href="/" className="generate-back">
        ← Back
      </Link>

      <h1 className="generate-title">New short drama</h1>
      <p className="generate-subtitle">
        Describe a pitch and pick a genre. The AI writes the script, generates
        comic-panel art, synthesizes narration, and assembles a vertical reel.
      </p>

      <label className="field-label" htmlFor="pitch">
        Your pitch
      </label>
      <textarea
        id="pitch"
        className="pitch-textarea"
        rows={4}
        placeholder={
          genre === "what-if"
            ? "What if Rome never fell? / What if AI ruled Earth?"
            : "e.g. A bodyguard falls for the heiress she's protecting"
        }
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        disabled={loading}
      />

      <label className="field-label">Genre</label>
      <div className="genre-grid">
        {GENRES.map((g) => (
          <button
            key={g}
            type="button"
            className={`genre-pill${genre === g ? " active" : ""}`}
            onClick={() => setGenre(g)}
            disabled={loading}
          >
            {g}
          </button>
        ))}
      </div>

      <button
        type="button"
        className="btn-generate"
        onClick={handleGenerate}
        disabled={loading || !prompt.trim()}
      >
        {loading ? "Generating…" : "Generate reel"}
      </button>

      {loading && stageDisplay && (
        <div className="generation-progress">
          <div className="generation-progress-bar">
            <div
              className="generation-progress-fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="stage-label">{stageDisplay}</p>
        </div>
      )}

      {error && <p className="error-msg">⚠ {error}</p>}

      <p className="pipeline-note">
        Pipeline: Groq LLM → image prompts → Pollinations.ai art → Edge TTS
        narration → FFmpeg video assembly. Generation takes 2–5 minutes.
      </p>
    </div>
  );
}

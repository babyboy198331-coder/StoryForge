"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { regenerateScene } from "@/lib/api";

export default function RegenerateSceneButton({
  reelId,
  sceneNumber,
}: {
  reelId: string;
  sceneNumber: number;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      await regenerateScene(reelId, sceneNumber);
      router.refresh();
    } catch (e: any) {
      setError(e.message || "Failed to regenerate this scene");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="regenerate-scene">
      <button onClick={handleClick} disabled={loading} className="regenerate-button">
        {loading ? "Regenerating… (re-renders full video)" : "🔁 Regenerate this scene"}
      </button>
      {error && <p className="regenerate-error">{error}</p>}
    </div>
  );
}

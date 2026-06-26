const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

export type Character = {
  name: string;
  appearance: string;
};

export type Scene = {
  scene: number;
  visual: string;
  narration: string;
  camera: string;
  duration_seconds: number;
  imageUrlStart: string;
  imageUrlEnd: string;
};

export type Reel = {
  id: string;
  title: string;
  hook: string;
  style: string;
  ending: string;
  hashtags: string[];
  characters: Character[];
  scenes: Scene[];
  videoUrl: string;
  hasNarration: boolean;
  hasMusic: boolean;
  createdAt: string;
};

export type GenerationStatus = {
  id: string;
  status: "running" | "done" | "error";
  stage: string;
  currentScene: number;
  totalScenes: number;
  reel: Reel | null;
  error: string | null;
};

export async function fetchFeed(): Promise<Reel[]> {
  const res = await fetch(`${API_BASE_URL}/api/reels`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load feed");
  return res.json();
}

export async function fetchReel(id: string): Promise<Reel> {
  const res = await fetch(`${API_BASE_URL}/api/reels/${id}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load reel");
  return res.json();
}

// Kicks off generation and returns immediately with a job id - poll
// getGenerationStatus(id) afterwards to track per-scene progress instead of
// waiting on one long request.
export async function startGenerateReel(prompt: string, genre: string): Promise<{ id: string }> {
  const res = await fetch(`${API_BASE_URL}/api/reels/generate/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, genre }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to start generating reel");
  }
  return res.json();
}

export async function getGenerationStatus(id: string): Promise<GenerationStatus> {
  const res = await fetch(`${API_BASE_URL}/api/reels/generate/${id}/status`, { cache: "no-store" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to check generation status");
  }
  return res.json();
}

export async function regenerateScene(reelId: string, sceneNumber: number): Promise<Reel> {
  const res = await fetch(`${API_BASE_URL}/api/reels/${reelId}/scenes/${sceneNumber}/regenerate`, {
    method: "POST",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to regenerate scene");
  }
  return res.json();
}

export async function deleteReel(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/reels/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete reel");
}

export function mediaUrl(path: string) {
  return `${API_BASE_URL}${path}`;
}

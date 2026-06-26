// Pollinations.ai - free, no API key required.
// Docs: https://pollinations.ai/

export function buildImageUrl(prompt, { width = 1080, height = 1920, seed } = {}) {
  const base = process.env.POLLINATIONS_BASE_URL || "https://image.pollinations.ai/prompt";
  const encoded = encodeURIComponent(prompt);
  const params = new URLSearchParams({
    width: String(width),
    height: String(height),
    nologo: "true",
  });
  if (seed !== undefined) params.set("seed", String(seed));
  return `${base}/${encoded}?${params.toString()}`;
}

// Pollinations generates on-demand at the URL itself, so "generating" an
// image for a scene just means building the right URL. We still expose this
// as an async function so it's a drop-in swap for a real generation API later.
export async function generateSceneImage(prompt, opts) {
  const url = buildImageUrl(prompt, opts);
  return { url };
}

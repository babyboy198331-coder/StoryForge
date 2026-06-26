import fetch from "node-fetch";
import fs from "fs";
import path from "path";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Pollinations.ai rate-limits aggressively under burst traffic (429s), so
// retry with backoff before giving up.
export async function downloadImage(url, destPath, { retries = 4, baseDelayMs = 2000 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status === 429) {
        const wait = baseDelayMs * Math.pow(2, attempt);
        console.warn(`Image gen rate-limited (429), retrying in ${wait}ms... (attempt ${attempt + 1}/${retries + 1})`);
        await sleep(wait);
        continue;
      }
      if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);

      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      const buffer = await res.arrayBuffer();
      fs.writeFileSync(destPath, Buffer.from(buffer));
      return destPath;
    } catch (err) {
      lastErr = err;
      await sleep(baseDelayMs);
    }
  }
  throw lastErr || new Error("Failed to fetch image after retries");
}

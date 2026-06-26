/**
 * Bulk-regenerates every scene of every reel (except Dragon Delivery Service)
 * by calling the existing /api/reels/:id/scenes/:n/regenerate endpoint.
 *
 * Each call: Groq image prompt → 2 Pollinations images → xfade clip → reassemble
 * Estimated time: ~45s per scene × total scenes ≈ 30–60 min
 *
 * Run: node bulk-regenerate-all.mjs
 * The backend must be running on localhost:4000.
 */

const API = "http://localhost:4000";
const SKIP_ID = "7a9093c3-ca3f-42c4-8278-0fd4f0ccfdd7"; // Dragon Delivery Service

function log(msg) { process.stdout.write(`${new Date().toLocaleTimeString()} ${msg}\n`); }

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchFeed() {
  const res = await fetch(`${API}/api/reels`);
  if (!res.ok) throw new Error(`Feed fetch failed: ${res.status}`);
  return res.json();
}

async function regenerateScene(reelId, sceneNumber, attempt = 1) {
  const url = `${API}/api/reels/${reelId}/scenes/${sceneNumber}/regenerate`;
  const res = await fetch(url, { method: "POST" });
  if (!res.ok) {
    const body = await res.text();
    if (attempt < 3) {
      log(`    retry ${attempt}/3 — ${res.status} ${body.slice(0, 80)}`);
      await sleep(5000);
      return regenerateScene(reelId, sceneNumber, attempt + 1);
    }
    throw new Error(`scene ${sceneNumber} failed after 3 attempts: ${res.status} ${body.slice(0,80)}`);
  }
  return res.json();
}

async function main() {
  log("=== Bulk Regenerate All Scenes ===");
  log("Fetching feed...");

  let feed;
  try {
    feed = await fetchFeed();
  } catch (err) {
    log(`ERROR: Cannot reach backend — is it running? ${err.message}`);
    process.exit(1);
  }

  const reels = feed.filter(r => r.id !== SKIP_ID);
  const totalScenes = reels.reduce((sum, r) => sum + (r.scenes?.length ?? 0), 0);
  log(`${reels.length} reels, ${totalScenes} scenes total\n`);

  let doneScenes = 0;

  for (const reel of reels) {
    const scenes = [...(reel.scenes ?? [])].sort((a, b) => a.scene - b.scene);
    log(`── ${reel.title} (${reel.id.slice(0, 8)}) — ${scenes.length} scenes`);

    for (const sc of scenes) {
      const start = Date.now();
      try {
        await regenerateScene(reel.id, sc.scene);
        const elapsed = ((Date.now() - start) / 1000).toFixed(0);
        doneScenes++;
        log(`  scene ${sc.scene} ✓ ${elapsed}s  [${doneScenes}/${totalScenes} total]`);
      } catch (err) {
        log(`  scene ${sc.scene} ERROR: ${err.message}`);
      }
      // Small pause between scenes to avoid Pollinations rate limiting
      await sleep(1500);
    }

    log(`  ── ${reel.title} done\n`);
  }

  log("=== All done. Hard-refresh the frontend. ===");
}

main().catch(err => { console.error("FATAL:", err); process.exit(1); });

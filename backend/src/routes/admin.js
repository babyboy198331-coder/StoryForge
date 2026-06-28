import express from "express";
import fs from "fs";
import path from "path";
import { uploadOutputVideo } from "../services/storage.js";
import { getReel, insertReel, updateReel } from "../services/feedStore.js";

const router = express.Router();

const STORAGE_DIR = path.join(process.cwd(), "storage");
const SEED_DIR = path.join(process.cwd(), "seed-assets");

// One specific, hardcoded reel: a finished "Dragon Delivery Service" video
// kept in the repo (backend/seed-assets/) so the feed always has at least one
// fully-rendered, instantly-playable reel at the top - useful for recruiters
// or anyone else opening the site cold, who shouldn't have to wait ~1-2
// minutes for the generation pipeline just to see what the app does.
//
// Idempotent and safe to call repeatedly: it always re-points this one fixed
// id at the bundled video and bumps its createdAt to now, so it stays pinned
// as the newest item. No secret/auth - the only thing this endpoint can do is
// re-seed this single fixed reel, which isn't something worth gating.
export async function seedFeaturedReel() {
  const seedJsonPath = path.join(SEED_DIR, "dragon-delivery.json");
  const seedVideoPath = path.join(SEED_DIR, "dragon-delivery.mp4");

  if (!fs.existsSync(seedJsonPath) || !fs.existsSync(seedVideoPath)) {
    throw new Error("Seed assets missing from deployment");
  }

  const base = JSON.parse(fs.readFileSync(seedJsonPath, "utf-8"));
  const id = base.id;

  const localDir = path.join(STORAGE_DIR, id);
  fs.mkdirSync(localDir, { recursive: true });
  fs.copyFileSync(seedVideoPath, path.join(localDir, "output.mp4"));

  const r2Url = await uploadOutputVideo(seedVideoPath, id);

  const reel = {
    ...base,
    videoUrl: r2Url || `/media/${id}/output.mp4`,
    createdAt: new Date().toISOString(),
  };

  const existing = await getReel(id);
  if (existing) {
    await updateReel(reel);
  } else {
    await insertReel(reel);
  }

  return { id, videoUrl: reel.videoUrl, r2: Boolean(r2Url) };
}

router.post("/seed-featured", async (req, res) => {
  try {
    const result = await seedFeaturedReel();
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;

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
router.post("/seed-featured", async (req, res) => {
  try {
    const seedJsonPath = path.join(SEED_DIR, "dragon-delivery.json");
    const seedVideoPath = path.join(SEED_DIR, "dragon-delivery.mp4");

    if (!fs.existsSync(seedJsonPath) || !fs.existsSync(seedVideoPath)) {
      return res.status(500).json({ error: "Seed assets missing from deployment" });
    }

    const base = JSON.parse(fs.readFileSync(seedJsonPath, "utf-8"));
    const id = base.id;

    // Always make sure a local copy exists at the normal per-reel path too,
    // so the /media static route can serve it as a fallback when R2 isn't
    // configured (or its upload fails).
    const localDir = path.join(STORAGE_DIR, id);
    fs.mkdirSync(localDir, { recursive: true });
    fs.copyFileSync(seedVideoPath, path.join(localDir, "output.mp4"));

    const r2Url = await uploadOutputVideo(seedVideoPath, id);

    const reel = {
      ...base,
      videoUrl: r2Url || `/media/${id}/output.mp4`,
      // Bump to now so this stays the newest (top-of-feed) item.
      createdAt: new Date().toISOString(),
    };

    const existing = await getReel(id);
    if (existing) {
      await updateReel(reel);
    } else {
      await insertReel(reel);
    }

    res.json({ ok: true, id, videoUrl: reel.videoUrl, r2: Boolean(r2Url) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;

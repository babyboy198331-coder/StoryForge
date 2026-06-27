import fs from "fs";
import path from "path";
import {
  DB_ENABLED,
  listReels as dbListReels,
  getReelById as dbGetReelById,
  insertReel as dbInsertReel,
  updateReel as dbUpdateReel,
  deleteReelById as dbDeleteReelById,
} from "./db.js";

// Reel metadata storage, backed by Postgres (Railway) when DATABASE_URL is
// set, falling back to the original flat-file storage/feed.json for local
// dev without a database. Both backends expose the same async API so
// reels.js doesn't need to know which one is active.
const STORAGE_DIR = path.join(process.cwd(), "storage");
const FEED_FILE = path.join(STORAGE_DIR, "feed.json");

function loadFeedFile() {
  if (!fs.existsSync(FEED_FILE)) return [];
  return JSON.parse(fs.readFileSync(FEED_FILE, "utf-8"));
}

function saveFeedFile(feed) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
  if (fs.existsSync(FEED_FILE)) {
    fs.copyFileSync(FEED_FILE, FEED_FILE + ".bak");
  }
  fs.writeFileSync(FEED_FILE, JSON.stringify(feed, null, 2));
}

// Newest-first, matching the old `loadFeed().reverse()` behavior in the feed
// route.
export async function listReelsNewestFirst() {
  if (DB_ENABLED) return (await dbListReels()).reverse();
  return loadFeedFile().reverse();
}

export async function getReel(id) {
  if (DB_ENABLED) return dbGetReelById(id);
  return loadFeedFile().find((r) => r.id === id) || null;
}

export async function insertReel(reel) {
  if (DB_ENABLED) return dbInsertReel(reel);
  const feed = loadFeedFile();
  feed.push(reel);
  saveFeedFile(feed);
}

export async function updateReel(reel) {
  if (DB_ENABLED) return dbUpdateReel(reel);
  const feed = loadFeedFile();
  const idx = feed.findIndex((r) => r.id === reel.id);
  if (idx === -1) throw new Error(`Reel ${reel.id} not found`);
  feed[idx] = reel;
  saveFeedFile(feed);
}

export async function deleteReel(id) {
  if (DB_ENABLED) return dbDeleteReelById(id);
  const feed = loadFeedFile();
  const idx = feed.findIndex((r) => r.id === id);
  if (idx !== -1) {
    feed.splice(idx, 1);
    saveFeedFile(feed);
  }
}

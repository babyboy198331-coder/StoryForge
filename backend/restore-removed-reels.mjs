/**
 * Restores reels that were removed from feed.json.
 * Rebuilds minimal entries from the storage directories.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORAGE_DIR = path.join(__dirname, "storage");
const FEED_PATH = path.join(STORAGE_DIR, "feed.json");

// Known metadata from the audit — titles and IDs
const RESTORE = [
  { id: "68ffb80c-2af4-423a-af13-96ff1ed69c8d", title: "Dragon's Breath",        hook: "A dragon awakens",              style: "Fantasy",          hashtags: ["DragonMagic","FantasyWorld","MagicIsReal"] },
  { id: "fd9f6364-942d-4384-a946-30ab9e9b9479", title: "Mythical Encounter",      hook: "Two legends collide",           style: "Fantasy Action",   hashtags: ["MythicalEncounter","FantasyAction"] },
  { id: "8d25b94e-9cf9-4e39-b245-e6b81a52d055", title: "Dragon's Bane",           hook: "The hunter becomes the hunted", style: "Dark Fantasy",     hashtags: ["DragonsBane","DarkFantasy"] },
  { id: "005e9774-3218-47c6-8887-c4695bc015eb", title: "Dragon's Fury",           hook: "Unleash the fire within",       style: "Action Fantasy",   hashtags: ["DragonsFury","ActionFantasy"] },
  { id: "1aeb352e-d831-47e1-a845-78da6c738d36", title: "Spellbound Clash",        hook: "Magic meets steel",             style: "Fantasy Action",   hashtags: ["SpellboundClash","MagicVsSteel"] },
  { id: "9858a7e1-65e0-4a46-8f47-a547a3cfb0f0", title: "Magical Mishap",          hook: "When spells go wrong",          style: "Comedy Fantasy",   hashtags: ["MagicalMishap","SpellFail"] },
  { id: "a6dbf2bb-8a70-4beb-86b4-3396f905d5e8", title: "Dragon Slayer Dispute",   hook: "Who gets the glory?",           style: "Comedy Adventure", hashtags: ["DragonSlayer","EpicDebate"] },
  { id: "cd01eba4-93fb-4db1-bb58-74072a210c3e", title: "Vehicle Showdown",        hook: "The ultimate race begins",      style: "Action",           hashtags: ["VehicleShowdown","RaceDay"] },
  { id: "d64b6603-71fa-413e-aa01-6525cc43337f", title: "The Unchosen Princess",   hook: "Destiny chose someone else",    style: "Drama Fantasy",    hashtags: ["UnchosenPrincess","RewriteYourStory"] },
  { id: "7f48b95d-bcd4-4c3d-a336-5ea560ddee93", title: "Midnight Calls",          hook: "The phone rings at 3am",        style: "Thriller Drama",   hashtags: ["MidnightCalls","3AM","NightmareReal"] },
  { id: "5d67a37c-c9fd-48ad-bafc-3fb7e0034982", title: "Midnight Call",           hook: "One call changes everything",   style: "Thriller",         hashtags: ["MidnightCall","OneCall"] },
];

const feed = JSON.parse(fs.readFileSync(FEED_PATH, "utf8"));
const existingIds = new Set(feed.map(r => r.id));

let added = 0;
for (const meta of RESTORE) {
  if (existingIds.has(meta.id)) {
    console.log(`  [skip] ${meta.title} already in feed`);
    continue;
  }

  const reelDir = path.join(STORAGE_DIR, meta.id);
  if (!fs.existsSync(reelDir)) {
    console.log(`  [skip] ${meta.title} — directory missing, cannot restore`);
    continue;
  }

  // Count scene images
  const files = fs.readdirSync(reelDir);
  const sceneNums = new Set();
  for (const f of files) {
    const m = f.match(/^scene-(\d+)(?:-(?:start|end))?\.jpg$/);
    if (m) sceneNums.add(Number(m[1]));
  }
  const sceneCount = sceneNums.size;

  // Build minimal scene entries
  const scenes = [...sceneNums].sort((a, b) => a - b).map(n => {
    const startFile = path.join(reelDir, `scene-${n}-start.jpg`);
    const endFile   = path.join(reelDir, `scene-${n}-end.jpg`);
    const legacyFile = path.join(reelDir, `scene-${n}.jpg`);
    if (fs.existsSync(startFile) && fs.existsSync(endFile)) {
      return { scene: n, visual: "", narration: "", camera: "", duration_seconds: 8,
               imageUrlStart: `/media/${meta.id}/scene-${n}-start.jpg`,
               imageUrlEnd:   `/media/${meta.id}/scene-${n}-end.jpg` };
    }
    return { scene: n, visual: "", narration: "", camera: "", duration_seconds: 8,
             imageUrl: `/media/${meta.id}/scene-${n}.jpg` };
  });

  const hasNarration = files.some(f => f === "narration.mp3" || f === "narration.wav");
  const hasMusic     = files.some(f => f === "music.mp3");

  const entry = {
    id: meta.id,
    title: meta.title,
    hook: meta.hook,
    style: meta.style,
    ending: "",
    hashtags: meta.hashtags,
    characters: [],
    scenes,
    videoUrl: `/media/${meta.id}/output.mp4`,
    hasNarration,
    hasMusic,
    createdAt: new Date(0).toISOString(),
  };

  feed.unshift(entry); // add to front so they appear in grid
  existingIds.add(meta.id);
  console.log(`  Restored: ${meta.title} (${sceneCount} scenes)`);
  added++;
}

fs.writeFileSync(FEED_PATH, JSON.stringify(feed, null, 2));
console.log(`\nDone. Restored ${added} reels. Feed now has ${feed.length} entries.`);

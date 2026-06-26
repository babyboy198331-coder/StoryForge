/**
 * Adds scenes 21-30 to Dragon Delivery Service — the final chapter.
 *
 * Arc:
 *  21 — the new package is a royal seal from the King himself
 *  22 — Ember flies to the royal palace, nervous and small
 *  23 — the palace gates open — the entire kingdom is waiting inside
 *  24 — the King and Queen descend the steps to meet her
 *  25 — Commander Scales steps forward and gives a speech
 *  26 — Ember is awarded the Royal Courier Medal before the whole kingdom
 *  27 — young dragon children in the crowd watch with stars in their eyes
 *  28 — Ember holds the medal and the compass — both glowing together
 *  29 — the Dragon Delivery Service flies in formation over the kingdom at sunset
 *  30 — FINAL: Ember at her windowsill, medal and compass in her lap, stars above,
 *           the kingdom glowing below — the ending monologue
 *
 * Run: node add-scenes-21-30.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";
import ffmpegPath from "ffmpeg-static";
import ffmpeg from "fluent-ffmpeg";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import os from "os";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });
ffmpeg.setFfmpegPath(ffmpegPath);

const REEL_ID   = "7a9093c3-ca3f-42c4-8278-0fd4f0ccfdd7";
const REEL_DIR  = path.join(__dirname, "storage", REEL_ID);
const FEED_PATH = path.join(__dirname, "storage", "feed.json");
const FEATURED  = path.join(__dirname, "storage", "featured-combined.mp4");
const CAPTION_FONT = "C:/Windows/Fonts/arialbd.ttf";
const OUTPUT_FPS   = 30;

const EMBER = "Ember, a small 5-year-old dragon with scales shimmering in shades of orange and red, short spiky hair, slender build, wearing a tiny brown leather backpack, and a distinctive scar above her left eyebrow";

// ── Scene definitions ─────────────────────────────────────────────────────────

const NEW_SCENES = [
  {
    n: 21, dur: 8,
    narration: "The package on her doorstep bears a wax seal she has never seen — a golden dragon crest pressed deep into crimson wax. The seal of the King.",
    visual: "Close-up of Ember holding the new package, staring at a royal golden dragon wax seal on it",
    camera: "Extreme close-up of the wax seal, Ember's clawed fingers trembling slightly",
    imgStartPrompt: `Fantasy adventure comic art, extreme close-up of ${EMBER}'s small orange clawed hands holding a package sealed with a large golden dragon crest wax seal pressed into deep crimson wax, Ember's wide eyes visible above the package reflecting the golden glow of the seal, pre-dawn light, awe and disbelief on her face, bold ink outlines, halftone texture, 9:16 vertical panel composition`,
    imgEndPrompt:   `Fantasy adventure comic art, close-up of ${EMBER} sitting on her doorstep holding the royal-sealed package to her chest, looking up at the still-dark sky with wide emotional eyes, the golden compass also glowing on her chest beside the package, overwhelmed with quiet wonder, bold ink outlines, screentone texture, 9:16 vertical panel composition`,
    s1: 21001, s2: 21002,
  },
  {
    n: 22, dur: 9,
    narration: "She has delivered to every corner of the kingdom — to farmers and fishermen, to widows and wanderers. But she has never once been called to the palace. Her wings tremble as the golden spires come into view.",
    visual: "Ember flies toward the royal palace, its golden spires gleaming in the morning light, looking very small against it",
    camera: "Wide aerial shot — Ember tiny against the massive glittering palace ahead",
    imgStartPrompt: `Fantasy adventure comic art, wide aerial shot of ${EMBER} flying through clear morning sky toward a massive magnificent royal palace ahead, golden spires gleaming in early morning sunlight, Ember appearing very small against the grand scale of the palace, the golden compass glowing on her chest, nervous energy in her posture, bold ink outlines, halftone texture, 9:16 vertical panel composition`,
    imgEndPrompt:   `Fantasy adventure comic art, wide aerial shot of ${EMBER} approaching the royal palace gates, enormous palace walls of white stone and gold rising above her, royal banners with dragon crests hanging from towers, morning light flooding the scene, Ember's wings pulling back as she descends, expression of nervous awe, bold ink outlines, screentone texture, 9:16 vertical panel composition`,
    s1: 22001, s2: 22002,
  },
  {
    n: 23, dur: 9,
    narration: "The gates open. And Ember's breath catches in her chest. The entire kingdom has come. Lining every wall, filling every balcony, crowding every courtyard — all of them, waiting. For her.",
    visual: "The palace gates swing open to reveal an enormous crowd of the entire kingdom gathered inside, all looking at Ember",
    camera: "Low angle shot from Ember's POV — gates opening, crowd revealed",
    imgStartPrompt: `Fantasy adventure comic art, low angle shot from ${EMBER}'s point of view as two enormous golden palace gates swing open dramatically, revealing a vast courtyard beyond packed with thousands of kingdom citizens of all kinds — humans, animals, creatures — all turning to look, morning light flooding through the opening gates, a sense of overwhelming scale, bold ink outlines, halftone texture, 9:16 vertical panel composition`,
    imgEndPrompt:   `Fantasy adventure comic art, wide dramatic shot of ${EMBER} standing small in the open palace gateway looking out at an enormous cheering crowd stretching as far as the eye can see, thousands of faces turned toward her, balconies overflowing with people waving, confetti and flower petals beginning to fall, ${EMBER} frozen in disbelief, bold ink outlines, screentone texture, 9:16 vertical panel composition`,
    s1: 23001, s2: 23002,
  },
  {
    n: 24, dur: 9,
    narration: "The King and Queen descend the palace steps — slowly, deliberately. They do not send a herald. They do not send a guard. The King and Queen of the entire realm walk down themselves. To meet one small dragon courier.",
    visual: "The King and Queen walk down grand palace steps toward Ember, the crowd parting for them",
    camera: "Wide shot — King and Queen descending steps, Ember small at the bottom",
    imgStartPrompt: `Fantasy adventure comic art, wide shot of a grand royal palace staircase, a tall dignified King in golden armor and deep blue robes and a graceful Queen in silver and white descending the steps side by side, the enormous cheering crowd parting on either side, ${EMBER} standing small at the base of the stairs looking up, bold ink outlines, halftone texture, 9:16 vertical panel composition`,
    imgEndPrompt:   `Fantasy adventure comic art, medium shot of the King and Queen reaching the bottom of the palace steps and kneeling down to be eye level with ${EMBER}, warm smiles on their faces, the King's golden crown catching morning light, the Queen reaching out to gently place a hand on Ember's shoulder, Ember's expression shifting from disbelief to overwhelmed emotion, bold ink outlines, screentone texture, 9:16 vertical panel composition`,
    s1: 24001, s2: 24002,
  },
  {
    n: 25, dur: 9,
    narration: "Commander Scales steps forward. The old dragon who has never praised anyone in forty years of service. His voice, when it comes, is not the bark of a commander. It is the voice of a teacher who finally sees what he always knew was there.",
    visual: "Commander Scales — the stern old green dragon — steps forward and speaks with unexpected warmth and pride",
    camera: "Close-up on Commander Scales' face — stern features soft for the first time",
    imgStartPrompt: `Fantasy adventure comic art, close-up portrait of Commander Scales, an imposing elderly dragon with dark green scales, gold epaulettes on a formal courier commander uniform, silver-streaked head, stepping forward from the crowd, his usually stern weathered face showing unexpected softness and deep pride, the crowd visible behind him, bold ink outlines, halftone texture, 9:16 vertical panel composition`,
    imgEndPrompt:   `Fantasy adventure comic art, two-shot of Commander Scales kneeling before ${EMBER} and placing one large green scaled hand gently on her small head, his face showing an expression of unmistakable pride, Ember looking up at him with tears beginning to form in her eyes, morning light warm between them, the palace and crowd blurred in the background, bold ink outlines, screentone texture, 9:16 vertical panel composition`,
    s1: 25001, s2: 25002,
  },
  {
    n: 26, dur: 10,
    narration: "The King raises a medal — gold and deep blue, a dragon in flight at its center — and places it around her neck beside the compass. The crowd erupts. The sound shakes the palace walls. And Ember, the smallest dragon in the Dragon Delivery Service, stands taller than she ever has.",
    visual: "The King places the Royal Courier Medal around Ember's neck before the roaring crowd",
    camera: "Close-up on the medal being placed around Ember's neck, then pull back wide to show the crowd erupting",
    imgStartPrompt: `Fantasy adventure comic art, close-up dramatic shot of the King's large hands lowering a magnificent gold and deep blue medal on a royal ribbon around ${EMBER}'s neck, the medal bearing a dragon in flight, it rests beside the golden compass already on her chest, Ember's face trembling with emotion, bold ink outlines, halftone texture, 9:16 vertical panel composition`,
    imgEndPrompt:   `Fantasy adventure comic art, wide triumphant shot of ${EMBER} standing on the palace steps facing the enormous roaring crowd, the Royal Courier Medal and golden compass both glowing on her chest, the King and Queen standing proudly behind her, Commander Scales beside them, the entire kingdom cheering with arms raised, confetti and flower petals filling the air, bold ink outlines, screentone texture, 9:16 vertical panel composition`,
    s1: 26001, s2: 26002,
  },
  {
    n: 27, dur: 8,
    narration: "In the front of the crowd, three young dragon hatchlings press against the gate, staring. Their eyes are full of something Ember recognizes — because she felt it once, long ago, standing outside these very gates, too small and too young and too uncertain. Wonder.",
    visual: "Three young dragon hatchlings in the crowd stare at Ember with wide eyes full of wonder and admiration",
    camera: "Close-up on the hatchlings' faces — awe and inspiration written plainly",
    imgStartPrompt: `Fantasy adventure comic art, close-up shot of three small dragon hatchlings of different colors — one blue, one purple, one yellow — pressed against the palace courtyard fence, eyes huge and round with wonder, staring off-panel at Ember receiving her medal, expressions of pure awe and inspiration, the cheering crowd blurred behind them, bold ink outlines, halftone texture, 9:16 vertical panel composition`,
    imgEndPrompt:   `Fantasy adventure comic art, close-up of one small blue dragon hatchling pointing toward ${EMBER} in the distance with a tiny claw, turning to whisper to the other hatchlings, all three with expressions that say they have just decided what they want to be when they grow up, wonder and determination on their tiny faces, bold ink outlines, screentone texture, 9:16 vertical panel composition`,
    s1: 27001, s2: 27002,
  },
  {
    n: 28, dur: 9,
    narration: "Later, when they ask her what it feels like to be a hero, Ember looks at the medal, and then at the compass, and then back at them. She says: I just wanted to make sure the packages got there. Every one of them. That was always enough.",
    visual: "Ember sits quietly, holding both the medal and the compass, a small peaceful smile on her face",
    camera: "Intimate close-up — Ember looking down at both glowing objects in her hands",
    imgStartPrompt: `Fantasy adventure comic art, intimate close-up of ${EMBER} sitting alone on the palace steps after the ceremony, both the Royal Courier Medal and the golden compass held in her small clawed hands resting in her lap, both glowing softly, her expression peaceful and quietly content, a small genuine smile, the empty quiet courtyard behind her, bold ink outlines, halftone texture, 9:16 vertical panel composition`,
    imgEndPrompt:   `Fantasy adventure comic art, close-up of ${EMBER}'s face looking directly at the viewer with a soft warm smile, the golden light of the compass and medal reflecting on her orange scales, expression of complete peace — not pride, just quiet satisfaction, the kind of face that knows exactly who it is, bold ink outlines, screentone texture, 9:16 vertical panel composition`,
    s1: 28001, s2: 28002,
  },
  {
    n: 29, dur: 10,
    narration: "As the sun melts into the horizon, the entire Dragon Delivery Service takes to the sky — every courier, every wing, flying in formation above the kingdom. A river of fire and color against the fading gold of the sky. For Ember. For all of them.",
    visual: "All the dragon couriers fly in perfect formation above the glowing kingdom at sunset",
    camera: "Epic wide aerial shot — dragon formation against a blazing sunset sky",
    imgStartPrompt: `Fantasy adventure comic art, epic wide aerial shot of dozens of dragon couriers of all sizes and colors flying in a precise V-formation against a blazing orange and purple sunset sky, the kingdom spread far below them glowing with warm amber lights, a single dragon slightly ahead of the formation leading — ${EMBER} — the golden compass glowing on her chest visible even from this distance, bold ink outlines, halftone texture, 9:16 vertical panel composition`,
    imgEndPrompt:   `Fantasy adventure comic art, wide aerial shot looking up from below at the dragon courier formation flying overhead against the sunset, their silhouettes dramatic against the burning orange and gold sky, the formation banking gracefully to turn above the kingdom, trails of color and light behind them, a breathtaking sense of scale and beauty, bold ink outlines, screentone texture, 9:16 vertical panel composition`,
    s1: 29001, s2: 29002,
  },
  {
    n: 30, dur: 13,
    narration: "That night, Ember sits at her windowsill one last time. The medal rests beside the compass in her lap. The kingdom glows quietly below. The stars fill the sky like a million tiny lanterns, each one a place she has not yet been, a door she has not yet knocked on, a person still waiting. She breathes in. She breathes out. And she smiles. Because she is Ember. Dragon courier. The smallest one they ever had. The bravest one there ever was. And tomorrow — tomorrow, she will fly again.",
    visual: "Ember at her windowsill at night — medal and compass in her lap, stars above, kingdom below — the perfect final image",
    camera: "Slow wide pull-back: close on Ember's peaceful face, widening to show the whole glowing kingdom under a vast starry sky",
    imgStartPrompt: `Fantasy adventure comic art, intimate close-up portrait of ${EMBER} sitting at her window at night, the Royal Courier Medal and golden compass resting together in her small lap both glowing softly, warm lamplight behind her, vast starry sky outside the window, her expression one of deep peaceful contentment and quiet joy, a small smile, eyes soft and full of tomorrow, bold ink outlines, halftone texture, 9:16 vertical panel composition`,
    imgEndPrompt:   `Fantasy adventure comic art, epic wide pull-back shot at night, ${EMBER}'s small glowing silhouette visible in a warm lit window high on a building, the vast magical kingdom stretching out below and around in all directions with thousands of warm amber lights, an enormous star-filled sky above, the golden compass light a tiny warm point in the window, a sense of infinite possibility and peace, the perfect final image, bold ink outlines, screentone texture, 9:16 vertical panel composition`,
    s1: 30001, s2: 30002,
  },
];

// Full narration — scenes 1-20 preserved, 21-30 new
const ALL_NARRATIONS = [
  "In a magical kingdom, where dragons and magic are a part of everyday life, meet Ember, the youngest member of the Dragon Delivery Service.",
  "With her keen sense of direction and agility, Ember navigates the kingdom, delivering packages to even the most remote locations.",
  "From the bustling markets of Willowdale to the snow-capped mountains of Frostbite Peak, Ember's deliveries bring joy and excitement to the people of the kingdom.",
  "With a keen sense of responsibility, Ember carefully collects and delivers each package, earning the trust of her clients.",
  "Even in the most challenging weather conditions, Ember perseveres, determined to complete her deliveries.",
  "After a long day of flying and delivering, Ember returns home to the warm welcome of her fellow dragons.",
  "As the sun sets on another successful day, Ember reflects on the joy and purpose she finds in her work as a dragon courier.",
  "But one morning, long before the kingdom stirs, Ember discovers a mysterious package at her door — sealed with ancient runes and glowing with magic she has never seen before. Only she can uncover its secret. And so the adventure truly begins.",
  "With trembling claws, Ember opens the package. Inside, a golden compass pulses with warm light — and a tucked note that reads: the kingdom needs its bravest courier. This was no ordinary delivery. This was a calling.",
  "Ember straps the compass to her chest, takes a deep breath, and leaps into the golden dawn. Wings wide, heart full — because that is what dragon couriers do. They always make the delivery.",
  "The compass pulls her north, past the edge of every map she has ever known, toward a dark and ancient forest the kingdom's elders only speak of in hushed tones.",
  "Hidden beneath the twisted canopy, Ember finds a village trapped in shadow — its lanterns dark, its people pale and weak, their magic slowly fading like embers in the rain.",
  "An ancient elder takes her hand and shows her a vision — a dark crystal buried deep in the forest, pulsing with stolen magic, feeding on the light of everything it touches.",
  "Ember descends into the cavern alone. The dark crystal towers above her, crackling with stolen magic, humming with a terrible power. For the first time in her young life — she is afraid.",
  "Then she remembers. Every door she has knocked on. Every smile she has earned. Every person who trusted her to find them — no matter the distance, no matter the storm. She is not afraid. She is their courage.",
  "She takes one deep breath — and breathes. Not just fire. But every ounce of heart she has. The compass blazes gold. The dragon's flame and ancient magic collide — and together, they shatter the darkness.",
  "Magic floods back through the forest like a sunrise. Lanterns reignite on their own. Flowers push through the frost. Color returns to everything. And a village that had forgotten hope — remembers.",
  "They lift her on their shoulders and cheer a name she has always carried — but only now truly earned. Not just courier. Not just Ember. Hero.",
  "As the twin moons rise over the kingdom, Ember glides home. Her colleagues wait at the gates — and even Commander Scales, who has never once smiled at anyone — is smiling.",
  "That night, Ember sits at her windowsill. The compass rests warm in her lap, the kingdom stretches quiet below, and the stars fill the sky like a million tiny lanterns. On her doorstep, she notices — another package is already waiting. She smiles. There will always be another delivery. And she will always make it. No matter how far. No matter how dark. Because that is who she is. Ember. Dragon courier. And the bravest there ever was.",
  // 21-30
  ...NEW_SCENES.map(s => s.narration),
];

// ── Helpers (identical pattern to previous scripts) ────────────────────────────

function log(msg) { console.log(msg); }

async function downloadImage(prompt, seed, destPath) {
  if (fs.existsSync(destPath) && fs.statSync(destPath).size > 5000) {
    log(`    [skip] ${path.basename(destPath)}`); return;
  }
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1080&height=1920&nologo=true&seed=${seed}`;
  log(`    Fetching seed=${seed}...`);
  const res = await fetch(url, { timeout: 90000 });
  if (!res.ok) throw new Error(`Image fetch failed: ${res.status}`);
  const buf = await res.buffer();
  if (buf.length < 5000) throw new Error(`Tiny response (${buf.length}b) seed=${seed}`);
  fs.writeFileSync(destPath, buf);
  log(`    Saved ${buf.length} bytes → ${path.basename(destPath)}`);
}

function wrapCaption(text, maxChars = 28) {
  const words = text.trim().split(/\s+/);
  const lines = []; let cur = "";
  for (const w of words) {
    const cand = cur ? `${cur} ${w}` : w;
    if (cand.length > maxChars && cur) { lines.push(cur); cur = w; } else cur = cand;
  }
  if (cur) lines.push(cur);
  return lines.join("\\n").replace(/\\/g, "\\\\").replace(/'/g, "'\\''");
}

function renderClip(startImg, endImg, narration, duration, outputPath) {
  if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1000) {
    log(`    [skip] ${path.basename(outputPath)}`); return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const half = duration / 2;
    const cmd = ffmpeg();
    cmd.input(startImg).loop(half);
    cmd.input(endImg).loop(half);
    let filter =
      `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,trim=duration=${half},fps=25[a]` +
      `;[1:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,trim=duration=${half},fps=25[b]` +
      `;[a][b]concat=n=2:v=1:a=0[pre]` +
      `;[pre]minterpolate=fps=${OUTPUT_FPS}:mi_mode=blend,trim=duration=${duration},setsar=1`;
    if (fs.existsSync(CAPTION_FONT) && narration) {
      filter += `,drawtext=fontfile='${CAPTION_FONT}':text='${wrapCaption(narration)}':fontsize=46:fontcolor=white:box=1:boxcolor=black@0.55:boxborderw=18:line_spacing=10:x=(w-text_w)/2:y=h-th-160`;
    }
    filter += "[outv]";
    cmd.complexFilter(filter)
      .outputOptions(["-map [outv]", "-an", "-pix_fmt yuv420p", "-preset", "veryfast"])
      .fps(OUTPUT_FPS).output(outputPath)
      .on("end", () => resolve()).on("error", reject).run();
  });
}

async function synthesizeNarration(texts) {
  const text = texts.join(" ");
  const tmpDir = path.join(os.tmpdir(), `edge-tts-${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  try {
    const tts = new MsEdgeTTS();
    await tts.setMetadata("en-US-AriaNeural", OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioFilePath } = await tts.toFile(tmpDir, text);
    return fs.readFileSync(audioFilePath);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

function assembleAll(clipPaths, narrationPath, outputPath) {
  return new Promise((resolve, reject) => {
    const cmd = ffmpeg();
    for (const p of clipPaths) cmd.input(p);
    cmd.input(narrationPath);
    const n = clipPaths.length;
    const inputs = clipPaths.map((_, i) => `[${i}:v]`).join("");
    cmd.complexFilter([`${inputs}concat=n=${n}:v=1:a=0[outv]`])
      .outputOptions([
        "-map [outv]", `-map ${n}:a`,
        "-c:v libx264", "-preset", "veryfast",
        "-c:a aac", "-shortest", "-pix_fmt yuv420p",
      ])
      .output(outputPath)
      .on("end", () => resolve()).on("error", reject).run();
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  log("=== Dragon Delivery Service — Scenes 21–30 (Final Chapter) ===\n");

  // Step 1 — images
  log("Step 1: Downloading 20 images (10 scenes × 2)...");
  for (const sc of NEW_SCENES) {
    log(`  Scene ${sc.n}:`);
    await downloadImage(sc.imgStartPrompt, sc.s1, path.join(REEL_DIR, `scene-${sc.n}-start.jpg`));
    await downloadImage(sc.imgEndPrompt,   sc.s2, path.join(REEL_DIR, `scene-${sc.n}-end.jpg`));
  }

  // Step 2 — render clips
  log("\nStep 2: Rendering 10 scene clips...");
  for (const sc of NEW_SCENES) {
    log(`  Scene ${sc.n}...`);
    await renderClip(
      path.join(REEL_DIR, `scene-${sc.n}-start.jpg`),
      path.join(REEL_DIR, `scene-${sc.n}-end.jpg`),
      sc.narration, sc.dur,
      path.join(REEL_DIR, `scene-${sc.n}-clip.mp4`),
    );
    log(`  Scene ${sc.n} done.`);
  }

  // Step 3 — narration
  const narrationPath = path.join(REEL_DIR, "narration-v5.mp3");
  if (!fs.existsSync(narrationPath)) {
    log("\nStep 3: Synthesizing 30-scene narration...");
    const buf = await synthesizeNarration(ALL_NARRATIONS);
    fs.writeFileSync(narrationPath, buf);
    log(`  Saved ${buf.length} bytes → narration-v5.mp3`);
  } else {
    log("\nStep 3: narration-v5.mp3 already exists, reusing.");
  }

  // Step 4 — assemble all 30 scenes
  log("\nStep 4: Assembling 30-scene video...");
  const clipPaths = [];
  for (let i = 1; i <= 30; i++) {
    const p = path.join(REEL_DIR, `scene-${i}-clip.mp4`);
    if (!fs.existsSync(p) || fs.statSync(p).size < 1000) throw new Error(`Missing/empty: scene-${i}-clip.mp4`);
    clipPaths.push(p);
  }
  const finalPath = path.join(REEL_DIR, "output.mp4");
  await assembleAll(clipPaths, narrationPath, finalPath);
  log(`  output.mp4 = ${(fs.statSync(finalPath).size / 1024).toFixed(1)} KB`);

  // Step 5 — featured
  fs.copyFileSync(finalPath, FEATURED);
  log("\nStep 5: featured-combined.mp4 updated.");

  // Step 6 — feed.json
  log("\nStep 6: Updating feed.json...");
  const feed = JSON.parse(fs.readFileSync(FEED_PATH, "utf8"));
  const reel = feed.find(r => r.id === REEL_ID);
  if (!reel) throw new Error("Reel not found in feed.json");
  for (const sc of NEW_SCENES) {
    if (!reel.scenes.find(s => s.scene === sc.n)) {
      reel.scenes.push({
        scene: sc.n, visual: sc.visual, narration: sc.narration,
        camera: sc.camera, duration_seconds: sc.dur,
        characters_present: ["Ember"],
        imageUrlStart: `https://image.pollinations.ai/prompt/${encodeURIComponent(sc.imgStartPrompt)}?width=1080&height=1920&nologo=true&seed=${sc.s1}`,
        imageUrlEnd:   `https://image.pollinations.ai/prompt/${encodeURIComponent(sc.imgEndPrompt)}?width=1080&height=1920&nologo=true&seed=${sc.s2}`,
      });
      log(`  Added scene ${sc.n}`);
    }
  }
  reel.ending = "Ember sits at her windowsill under the stars, medal and compass in her lap — the smallest dragon, the bravest courier, ready to fly again tomorrow.";
  reel.scenes = reel.scenes.sort((a, b) => a.scene - b.scene);
  fs.writeFileSync(FEED_PATH, JSON.stringify(feed, null, 2));

  log("\n=== DONE! Dragon Delivery Service — 30 scenes. The story is complete. ===");
  log("Restart backend → hard-refresh homepage (Ctrl+Shift+R).");
}

main().catch(err => {
  console.error("\nFAILED:", err.message || err);
  process.exit(1);
});

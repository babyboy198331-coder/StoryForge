/**
 * Adds scenes 11-20 to Dragon Delivery Service (7a9093c3).
 *
 * Arc:
 *  11 — compass leads Ember beyond every map, toward an ancient forest
 *  12 — hidden village found, trapped in shadow, magic draining
 *  13 — elder shows her a dark crystal stealing all the magic
 *  14 — Ember faces the crystal alone — it towers above her
 *  15 — she remembers every face, every door, every trust placed in her
 *  16 — she breathes fire + compass magic — shatters the crystal
 *  17 — magic floods back, village reawakens
 *  18 — villagers celebrate her — not just courier, hero
 *  19 — Ember glides home at dusk, colleagues waiting, even Commander Scales smiles
 *  20 — ENDING: windowsill at night, compass in lap, new package already at the door
 *
 * Run: node add-scenes-11-20.mjs
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

// ── New scene definitions ─────────────────────────────────────────────────────

const NEW_SCENES = [
  {
    n: 11, dur: 8,
    narration: "The compass pulls her north, past the edge of every map she has ever known, toward a dark and ancient forest the kingdom's elders only speak of in hushed tones.",
    visual: "Ember flies north over rolling hills, the landscape growing darker and wilder ahead of her",
    camera: "Aerial tracking shot behind Ember as she flies toward a shadowy treeline on the horizon",
    imgStartPrompt: `Fantasy adventure comic art, aerial tracking shot behind ${EMBER} flying north over rolling green hills, a golden compass glowing on her chest, a dark ancient forest looming on the horizon ahead, dramatic contrast between warm sunlit hills and shadowy treeline, bold ink outlines, halftone texture, dynamic comic shading, 9:16 vertical panel composition`,
    imgEndPrompt:   `Fantasy adventure comic art, aerial tracking shot behind ${EMBER} flying closer toward an enormous dark ancient forest, twisted trees stretching high, fog curling at the treeline, the golden compass on her chest pointing straight ahead, determined expression visible in profile, bold ink outlines, screentone texture, 9:16 vertical panel composition`,
    s1: 11001, s2: 11002,
  },
  {
    n: 12, dur: 9,
    narration: "Hidden beneath the twisted canopy, Ember finds a village trapped in shadow — its lanterns dark, its people pale and weak, their magic slowly fading like embers in the rain.",
    visual: "Ember lands in a gloomy hidden village where the people look exhausted and the lanterns are all dark",
    camera: "Wide establishing shot of the shadowed village with Ember small in the center",
    imgStartPrompt: `Fantasy adventure comic art, wide establishing shot of a hidden village deep inside a dark ancient forest, twisted tall trees blocking almost all light, lanterns hanging cold and unlit, pale exhausted villagers with hollow eyes standing in doorways, ${EMBER} landing small in the center of the village square, atmosphere of despair and fading magic, bold ink outlines, halftone texture, dramatic shadow lighting, 9:16 vertical panel composition`,
    imgEndPrompt:   `Fantasy adventure comic art, medium shot of ${EMBER} standing in the center of the shadowed village square, surrounded by weak and hollow-eyed villagers reaching toward her with hope, the golden compass on her chest glowing warmly against the dark surroundings, compassion visible on her face, bold ink outlines, screentone texture, 9:16 vertical panel composition`,
    s1: 12001, s2: 12002,
  },
  {
    n: 13, dur: 9,
    narration: "An ancient elder takes her hand and shows her a vision — a dark crystal buried deep in the forest, pulsing with stolen magic, feeding on the light of everything it touches.",
    visual: "An old village elder holds Ember's claw and shows her a glowing vision of a massive dark crystal deep in the forest",
    camera: "Close two-shot of elder and Ember, vision of dark crystal shimmering between them",
    imgStartPrompt: `Fantasy adventure comic art, close two-shot of a tall ancient elder with long white robes and silver hair holding the small clawed hand of ${EMBER}, a shimmering magical vision floating between them showing a massive pulsing dark crystal deep underground, blue magical light casting eerie shadows, bold ink outlines, halftone texture, 9:16 vertical panel composition`,
    imgEndPrompt:   `Fantasy adventure comic art, close-up insert of the magical vision: a towering dark crystal crackling with stolen purple and black energy deep inside a stone cavern, tendrils of stolen light swirling into it, ${EMBER}'s small orange hand reaching toward the vision in alarm, bold ink outlines, screentone texture, 9:16 vertical panel composition`,
    s1: 13001, s2: 13002,
  },
  {
    n: 14, dur: 9,
    narration: "Ember descends into the cavern alone. The dark crystal towers above her, crackling with stolen magic, humming with a terrible power. For the first time in her young life — she is afraid.",
    visual: "Ember alone in a vast underground cavern, facing a massive dark crystal that crackles with stolen magic",
    camera: "Low angle wide shot — crystal towers huge, Ember tiny below it",
    imgStartPrompt: `Fantasy adventure comic art, low angle dramatic wide shot inside a vast underground stone cavern, a massive towering dark crystal crackling with stolen purple and black energy dominates the frame, ${EMBER} standing tiny at the base looking up at it, fear and awe on her face, single beam of faint light from above, bold ink outlines, halftone texture, 9:16 vertical panel composition`,
    imgEndPrompt:   `Fantasy adventure comic art, low angle close shot of ${EMBER} standing before the base of the enormous dark crystal, fists clenched at her sides, eyes wide with fear but jaw set with resolve, crackling purple energy reflected in her orange scales, the golden compass on her chest pulsing, bold ink outlines, screentone texture, 9:16 vertical panel composition`,
    s1: 14001, s2: 14002,
  },
  {
    n: 15, dur: 9,
    narration: "Then she remembers. Every door she has knocked on. Every smile she has earned. Every person who trusted her to find them — no matter the distance, no matter the storm. She is not afraid. She is their courage.",
    visual: "A montage vision swirls around Ember — faces of everyone she has delivered to, all the smiles and grateful eyes",
    camera: "Close-up on Ember's face, reflections of the people she has helped glowing in her eyes",
    imgStartPrompt: `Fantasy adventure comic art, close-up portrait of ${EMBER} standing in the dark cavern, eyes closed, glowing golden visions of grateful faces, warm doorways, and smiling people swirling around her like memories, the fear replaced with quiet determination, warm gold light from the compass pushing back the darkness, bold ink outlines, halftone texture, 9:16 vertical panel composition`,
    imgEndPrompt:   `Fantasy adventure comic art, close-up of ${EMBER}'s face with eyes now open and blazing orange with resolve, reflections of smiling village faces glowing in her eyes, the compass on her chest radiating bright golden light, the dark crystal crackling in the blurred background, expression of pure courage, bold ink outlines, screentone texture, 9:16 vertical panel composition`,
    s1: 15001, s2: 15002,
  },
  {
    n: 16, dur: 10,
    narration: "She takes one deep breath — and breathes. Not just fire. But every ounce of heart she has. The compass blazes gold. The dragon's flame and ancient magic collide — and together, they shatter the darkness.",
    visual: "Ember unleashes a massive blast of golden-fire breath at the dark crystal, compass blazing, the crystal exploding in brilliant light",
    camera: "Wide dramatic shot — Ember breathing golden fire, crystal shattering in an explosion of light",
    imgStartPrompt: `Fantasy adventure comic art, wide dramatic shot of ${EMBER} rearing back and unleashing a massive stream of golden-orange dragon fire at the towering dark crystal, the compass on her chest blazing blinding gold, fire and magic intertwining into something beautiful and powerful, bold ink outlines, halftone texture, dynamic action lines, 9:16 vertical panel composition`,
    imgEndPrompt:   `Fantasy adventure comic art, wide explosion shot of the dark crystal shattering into a thousand brilliant fragments of light, ${EMBER} at the center of the blast surrounded by golden and orange radiance, stolen magic exploding outward in rays of color, the cavern filled with blinding beautiful light, bold ink outlines, screentone texture, 9:16 vertical panel composition`,
    s1: 16001, s2: 16002,
  },
  {
    n: 17, dur: 9,
    narration: "Magic floods back through the forest like a sunrise. Lanterns reignite on their own. Flowers push through the frost. Color returns to everything. And a village that had forgotten hope — remembers.",
    visual: "The hidden village reawakens — lanterns blazing back to life, flowers blooming, color flooding back into everything",
    camera: "Wide shot of the village transforming from grey to vibrant as magic returns",
    imgStartPrompt: `Fantasy adventure comic art, wide shot of the hidden village mid-transformation, lanterns igniting spontaneously one by one, villagers gasping and reaching toward the light, grey frost-covered ground cracking as flowers push through in bright color, the dark forest canopy parting to let in golden light from above, ${EMBER} emerging from the forest edge glowing, bold ink outlines, halftone texture, 9:16 vertical panel composition`,
    imgEndPrompt:   `Fantasy adventure comic art, wide celebration shot of the hidden village now fully restored to vibrant color, lanterns blazing warm amber, flowers blooming everywhere, villagers crying happy tears, children running and laughing, ${EMBER} standing in the center grinning with the golden compass glowing peacefully on her chest, bold ink outlines, screentone texture, 9:16 vertical panel composition`,
    s1: 17001, s2: 17002,
  },
  {
    n: 18, dur: 8,
    narration: "They lift her on their shoulders and cheer a name she has always carried — but only now truly earned. Not just courier. Not just Ember. Hero.",
    visual: "The villagers lift Ember onto their shoulders, cheering and celebrating her as a hero",
    camera: "Low angle looking up at Ember held aloft by celebrating villagers",
    imgStartPrompt: `Fantasy adventure comic art, low angle triumphant shot of ${EMBER} being lifted on the shoulders of joyful villagers, arms spread wide, golden compass glowing on her chest, cheering crowds below and around her, village lanterns blazing warmly in the background, confetti and flower petals in the air, bold ink outlines, halftone texture, 9:16 vertical panel composition`,
    imgEndPrompt:   `Fantasy adventure comic art, low angle close shot of ${EMBER} held aloft by cheering villagers, looking up at the sky with a wide joyful grin, tears of happiness on her cheeks, golden light from the compass radiating outward, the word HERO could be implied in the expressions of every face below her, bold ink outlines, screentone texture, 9:16 vertical panel composition`,
    s1: 18001, s2: 18002,
  },
  {
    n: 19, dur: 8,
    narration: "As the twin moons rise over the kingdom, Ember glides home. Her colleagues wait at the gates — and even Commander Scales, who has never once smiled at anyone — is smiling.",
    visual: "Ember glides through the moonlit sky back toward the Dragon Delivery Service headquarters where her colleagues wait outside cheering",
    camera: "Wide aerial shot of Ember descending toward warm glowing headquarters under twin moons",
    imgStartPrompt: `Fantasy adventure comic art, wide aerial shot of ${EMBER} gliding gracefully through a moonlit sky toward the Dragon Delivery Service headquarters below, twin moons visible in the purple night sky, the building glowing warmly with amber lights, small dragon silhouettes visible waiting outside the gates, bold ink outlines, halftone texture, 9:16 vertical panel composition`,
    imgEndPrompt:   `Fantasy adventure comic art, wide ground shot of ${EMBER} landing at the gates of the Dragon Delivery Service headquarters at night, a crowd of fellow dragon couriers of various sizes and colors cheering and waving, an imposing elderly dragon in a commander's uniform with green scales and gold epaulettes standing at the front with an unexpected warm smile, twin moons overhead, bold ink outlines, screentone texture, 9:16 vertical panel composition`,
    s1: 19001, s2: 19002,
  },
  {
    n: 20, dur: 11,
    narration: "That night, Ember sits at her windowsill. The compass rests warm in her lap, the kingdom stretches quiet below, and the stars fill the sky like a million tiny lanterns. On her doorstep, she notices — another package is already waiting. She smiles. There will always be another delivery. And she will always make it. No matter how far. No matter how dark. Because that is who she is. Ember. Dragon courier. And the bravest there ever was.",
    visual: "Ember sits at her windowsill at night, compass glowing softly in her lap, stars above, a new package waiting at her door below",
    camera: "Slow wide pull-back from close on Ember's peaceful face to reveal the whole kingdom beyond her window",
    imgStartPrompt: `Fantasy adventure comic art, medium close shot of ${EMBER} sitting peacefully on her windowsill at night, the golden compass glowing softly in her small clawed hands, warm lamplight inside behind her, vast starry sky outside, kingdom lights twinkling below, expression of complete peace and quiet pride, bold ink outlines, halftone texture, 9:16 vertical panel composition`,
    imgEndPrompt:   `Fantasy adventure comic art, wide pull-back shot from ${EMBER}'s windowsill at night, her small silhouette framed in the warm window above, far below on the stone doorstep a new mysterious package sits waiting wrapped in ribbon, the vast starry sky and glowing kingdom stretching into the distance, a sense of infinite possibility, bold ink outlines, screentone texture, 9:16 vertical panel composition`,
    s1: 20001, s2: 20002,
  },
];

// Full 20-scene narration list
const ALL_NARRATIONS = [
  // Scenes 1-10 (existing)
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
  // Scenes 11-20 (new)
  ...NEW_SCENES.map(s => s.narration),
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function log(msg) { console.log(msg); }

async function downloadImage(prompt, seed, destPath) {
  if (fs.existsSync(destPath) && fs.statSync(destPath).size > 5000) {
    log(`    [skip] ${path.basename(destPath)}`);
    return;
  }
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1080&height=1920&nologo=true&seed=${seed}`;
  log(`    Fetching seed=${seed}...`);
  const res = await fetch(url, { timeout: 90000 });
  if (!res.ok) throw new Error(`Image fetch failed: ${res.status}`);
  const buf = await res.buffer();
  if (buf.length < 5000) throw new Error(`Tiny response (${buf.length}b) for seed=${seed}`);
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
    log(`    [skip] ${path.basename(outputPath)}`);
    return Promise.resolve();
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

    cmd
      .complexFilter(filter)
      .outputOptions(["-map [outv]", "-an", "-pix_fmt yuv420p", "-preset", "veryfast"])
      .fps(OUTPUT_FPS)
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", reject)
      .run();
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
    const concatInputs = clipPaths.map((_, i) => `[${i}:v]`).join("");

    cmd
      .complexFilter([`${concatInputs}concat=n=${n}:v=1:a=0[outv]`])
      .outputOptions([
        "-map [outv]", `-map ${n}:a`,
        "-c:v libx264", "-preset", "veryfast",
        "-c:a aac", "-shortest", "-pix_fmt yuv420p",
      ])
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", reject)
      .run();
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  log("=== Dragon Delivery Service — Scenes 11–20 ===\n");

  // Step 1 — download images for scenes 11-20
  log("Step 1: Downloading images (10 scenes × 2 = 20 images)...");
  for (const sc of NEW_SCENES) {
    log(`  Scene ${sc.n}:`);
    await downloadImage(sc.imgStartPrompt, sc.s1, path.join(REEL_DIR, `scene-${sc.n}-start.jpg`));
    await downloadImage(sc.imgEndPrompt,   sc.s2, path.join(REEL_DIR, `scene-${sc.n}-end.jpg`));
  }

  // Step 2 — render clips for scenes 11-20
  log("\nStep 2: Rendering 10 new scene clips...");
  for (const sc of NEW_SCENES) {
    log(`  Scene ${sc.n}/${sc.n}...`);
    await renderClip(
      path.join(REEL_DIR, `scene-${sc.n}-start.jpg`),
      path.join(REEL_DIR, `scene-${sc.n}-end.jpg`),
      sc.narration, sc.dur,
      path.join(REEL_DIR, `scene-${sc.n}-clip.mp4`),
    );
    log(`  Scene ${sc.n} done.`);
  }

  // Step 3 — synthesize full 20-scene narration
  const narrationPath = path.join(REEL_DIR, "narration-v4.mp3");
  if (!fs.existsSync(narrationPath)) {
    log("\nStep 3: Synthesizing 20-scene narration...");
    const buf = await synthesizeNarration(ALL_NARRATIONS);
    fs.writeFileSync(narrationPath, buf);
    log(`  Saved ${buf.length} bytes → narration-v4.mp3`);
  } else {
    log("\nStep 3: narration-v4.mp3 already exists, reusing.");
  }

  // Step 4 — assemble all 20 scenes
  log("\nStep 4: Assembling full 20-scene video...");
  const clipPaths = [];
  for (let i = 1; i <= 20; i++) {
    const p = path.join(REEL_DIR, `scene-${i}-clip.mp4`);
    if (!fs.existsSync(p) || fs.statSync(p).size < 1000) throw new Error(`Missing/empty: scene-${i}-clip.mp4`);
    clipPaths.push(p);
  }

  const finalPath = path.join(REEL_DIR, "output.mp4");
  await assembleAll(clipPaths, narrationPath, finalPath);
  const size = (fs.statSync(finalPath).size / 1024).toFixed(1);
  log(`  output.mp4 = ${size} KB`);

  // Step 5 — update featured-combined.mp4
  fs.copyFileSync(finalPath, FEATURED);
  log("\nStep 5: featured-combined.mp4 updated.");

  // Step 6 — update feed.json
  log("\nStep 6: Updating feed.json...");
  const feed = JSON.parse(fs.readFileSync(FEED_PATH, "utf8"));
  const reel = feed.find(r => r.id === REEL_ID);
  if (!reel) throw new Error("Reel not found in feed.json");

  for (const sc of NEW_SCENES) {
    if (!reel.scenes.find(s => s.scene === sc.n)) {
      reel.scenes.push({
        scene: sc.n,
        visual: sc.visual,
        narration: sc.narration,
        camera: sc.camera,
        duration_seconds: sc.dur,
        characters_present: ["Ember"],
        imageUrlStart: `https://image.pollinations.ai/prompt/${encodeURIComponent(sc.imgStartPrompt)}?width=1080&height=1920&nologo=true&seed=${sc.s1}`,
        imageUrlEnd:   `https://image.pollinations.ai/prompt/${encodeURIComponent(sc.imgEndPrompt)}?width=1080&height=1920&nologo=true&seed=${sc.s2}`,
      });
      log(`  Added scene ${sc.n}`);
    }
  }
  reel.ending = "Ember sits at her windowsill under the stars, compass in her lap, a new package waiting at her door — because the bravest courier's work is never done.";
  fs.writeFileSync(FEED_PATH, JSON.stringify(feed, null, 2));

  // Done
  log("\n=== DONE! Dragon Delivery Service — 20 scenes, proper ending. ===");
  log("Hard-refresh the homepage (Ctrl+Shift+R) to watch the full reel.");
}

main().catch(err => {
  console.error("\nFAILED:", err.message || err);
  process.exit(1);
});

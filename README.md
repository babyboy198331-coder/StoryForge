# StoryForge

An AI-generated short-drama reel app (a "Reelz"-style portfolio project). You
give it a one-line pitch and a genre; it writes a script, generates
comic-style scene art, narrates it, burns in captions, scores it with
background music, and stitches everything into a vertical MP4 you can swipe
through in a TikTok-style feed. Every piece of the pipeline runs on a free
tier or self-hosted tool - no paid APIs required.

## Pipeline

```
User prompt
   -> Groq (Llama 3.3 70B): generates a structured JSON script (title, hook,
      style, narrator gender, scenes with visual/narration/camera/duration,
      ending, hashtags). Targets ~60 seconds total (7-9 scenes, 7-10s each).
   -> Groq: turns each scene into a detailed, cinematic image-generation prompt
   -> Pollinations.ai: free, no-key image generation per scene (generated
      sequentially with backoff/retry to respect its rate limits)
   -> Piper TTS (optional, free, self-hosted): narration audio for the full
      script, with the narrator's voice gender chosen by Groq based on the
      protagonist. If not set up, the app falls back to silent/caption-only
      mode instead of failing.
   -> FFmpeg:
        - Ken Burns pan/zoom on every scene image (alternating direction)
        - burned-in captions per scene, drawn from that scene's narration text
        - narration audio and/or a randomly-picked background music track
          mixed in (music ducked under narration)
        - concatenated into a single 1080x1920 vertical MP4
   -> Feed: Next.js vertical scroll-snap player, like a Reels/TikTok feed,
      with a tap-to-mute control on each video
```

## Project structure

```
backend/    Node/Express API - runs the generation pipeline
frontend/   Next.js app - vertical feed + generate screen
```

## Setup

### 1. Get a Groq key (required, free)

https://console.groq.com/keys — sign up, create a key, no credit card
required. This powers script + image-prompt generation.

### 2. Set up Piper TTS (optional, free, self-hosted narration)

No signup at all - this runs entirely on your machine.

1. Download the Windows binary from
   https://github.com/rhasspy/piper/releases and unzip it into
   `backend/piper/` so that `backend/piper/piper.exe` exists alongside its
   DLLs and the `espeak-ng-data` folder.
2. Download a female and male voice model from
   https://github.com/rhasspy/piper/blob/master/VOICES.md - this project
   uses `en_US-amy-medium` (female) and `en_US-ryan-medium` (male). Each
   voice needs both its `.onnx` file and matching `.onnx.json` file. Put all
   four files in `backend/piper/voices/`.
3. Point `PIPER_EXECUTABLE`, `PIPER_VOICE_FEMALE`, and `PIPER_VOICE_MALE` in
   `.env` at those files (already set if you used the paths above).

If you skip this, reels still generate, just with captions and music but no
spoken narration.

(We tried ElevenLabs and Google Cloud TTS first - both either need a paid
plan or a credit card for real use, so Piper is the only option here with
zero strings attached.)

### 3. Add background music (optional, free)

1. Download a few short instrumental tracks (mp3) from
   https://pixabay.com/music/ - no signup required, free for any use, no
   attribution needed. Cinematic/ambient/trailer-style tracks work best
   since they won't clash with narration.
2. Drop them into `backend/music/`.
3. `MUSIC_DIR` in `.env` already points at that folder. One track is picked
   at random per reel and mixed in quietly under the narration.

If the folder's empty, reels generate without music.

### 4. Backend

```bash
cd backend
cp .env.example .env
# paste your GROQ_API_KEY into .env (and set up Piper/music above if you want them)
npm install
npm run dev
```

Runs on http://localhost:4000.

### 5. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Runs on http://localhost:3000. Open it, tap **+ New**, type a one-line pitch,
pick a genre, and generate. Reels run ~60 seconds long (7-9 scenes), so
generation takes roughly 1-2 minutes (sequential image generation + video
assembly are the slow steps). The reel then shows up at the top of the feed.

### Genres

cinematic, romance, fantasy, revenge, horror, comedy, sci-fi,
alternate-history, survival, mystery, space, cyberpunk, time-travel,
mythology, post-apocalypse, true-crime, inspirational, ai-stories, what-if

Picking **what-if** swaps the prompt box placeholder to example "what if"
pitches (e.g. "What if Rome never fell?", "What if AI ruled Earth?") since
that framing tends to produce the most varied, generatable story ideas.

## Features

- **Script generation** - Groq writes title, hook, per-scene visuals,
  narration, camera direction, scene durations, an ending, and hashtags as
  structured JSON.
- **Scene art** - Groq turns each scene into a detailed cinematic image
  prompt; Pollinations.ai renders it for free, no API key.
- **Gender-matched narration** - Groq decides the narrator's voice based on
  the story's protagonist; Piper TTS synthesizes it locally and for free.
- **Ken Burns motion** - every static scene image gets a subtle pan/zoom via
  FFmpeg's `zoompan` filter instead of sitting still.
- **Burned-in captions** - each scene's narration line is rendered as
  on-screen text (FFmpeg `drawtext`), so reels work even muted.
- **Background music** - a random royalty-free track is mixed in quietly
  under the narration via FFmpeg's `amix`.
- **TikTok-style feed** - vertical scroll-snap video feed (Next.js) with a
  tap-to-mute control per video.

## Notes / known limits

- Pollinations.ai images are free but lower fidelity than paid models
  (DALL·E, Stability, Kling). Swapping in a paid image API is a drop-in
  change in `backend/src/services/pollinations.js`.
- Scenes use a Ken Burns pan/zoom effect (FFmpeg `zoompan`), not true
  AI-generated video motion. Real image-to-video (Kling, Runway, Stable Video
  Diffusion) can be swapped into `backend/src/services/ffmpeg.js`'s pipeline
  once you're ready to pay for it or self-host a model.
- Narration is synthesized as one continuous track over the full script and
  trimmed to fit, rather than timed per-scene - so spoken audio and the
  per-scene captions are approximately, not frame-exactly, in sync.
- Captions need `CAPTION_FONT_PATH` to resolve to a real font file (defaults
  to Windows' built-in Arial Bold); if that file isn't found, captions are
  skipped automatically rather than breaking generation.
- No auth, likes, comments, or following yet - the feed currently just lists
  every reel ever generated, newest first, from `backend/storage/feed.json`.
- Avoid prompting for copyrighted characters/franchises - keep story ideas
  original to stay clear of any IP issues.

## Suggested next features (portfolio polish)

- User accounts (Firebase Auth or NextAuth) + per-user reel ownership
- Postgres/Prisma (or even SQLite) instead of the flat `feed.json` file
- Likes, comments, follows, search
- Per-scene generation progress (polling/SSE) instead of a static
  "Generating..." button during the 1-2 minute pipeline run
- A fixed character/style sheet passed into every image prompt for visual
  consistency of recurring characters across scenes
- Swap Pollinations for Stability/DALL·E and add a "regenerate scene" button
- Lazy-load/pause feed videos outside the viewport (IntersectionObserver)
  instead of autoplaying every video in the feed at once

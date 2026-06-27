# StoryForge — Project Summary (Interview Notes)

## What it is
An AI pipeline that turns a one-line story pitch into a fully-produced vertical
video reel (TikTok/Reels style): a written script, AI-generated comic-style
scene art, narration, captions, background music, and a stitched MP4 — then
serves it in a swipeable feed. Every step runs on free-tier or self-hosted
tools, no paid video-gen APIs.

## Tech stack
- **Backend**: Node.js, Express
- **Frontend**: Next.js 14, TypeScript, vertical scroll-snap feed UI
- **LLM**: Groq (Llama 3.3 70B) — script generation + per-scene image prompts
- **Image generation**: Pollinations.ai (free, no API key)
- **TTS**: Piper (self-hosted, free, gender-matched narrator voice)
- **Video assembly**: FFmpeg — Ken Burns pan/zoom, burned-in captions, audio
  mixing (narration + music), concatenation into 1080x1920 MP4
- **Database**: PostgreSQL (Railway-managed)
- **Object storage**: Cloudflare R2 (S3-compatible) for rendered videos
- **Hosting**: Vercel (frontend), Railway (backend + Postgres)

## Pipeline (what happens on generation)
1. User submits a pitch + genre
2. Groq writes a structured JSON script: title, hook, scenes (visual,
   narration, camera, duration), ending, hashtags
3. Groq converts each scene into a cinematic image-gen prompt
4. Pollinations.ai renders each scene image (sequential, with retry/backoff)
5. Piper TTS synthesizes narration for the full script
6. FFmpeg assembles everything — pan/zoom motion, captions, music ducked
   under narration, concatenated into one vertical video
7. Result is saved to Postgres (metadata) + R2 (video file) and appears at
   the top of the feed

## Key engineering work
- Built the end-to-end generation pipeline from scratch (prompt → script →
  images → narration → assembled video)
- Migrated metadata storage from a flat JSON file to Postgres, with a clean
  storage-abstraction layer so both backends share one API
- Added Cloudflare R2 upload so rendered videos survive redeploys (local
  disk doesn't persist on Railway)
- Locked down CORS to a real allowlist (specific frontend origin + Vercel
  preview-deployment regex) instead of wide-open access
- Deployed as three separate managed services (Vercel, Railway, R2), wired
  together entirely through environment variables — local dev still works
  unmodified if those are left unset
- Added an idempotent admin endpoint that seeds one fully-rendered demo reel
  into a fresh database, so a recruiter opening the live site sees a
  playable video immediately instead of an empty state or a 1–2 minute
  generation wait
- Diagnosed and fixed a production bug where the homepage's featured video
  pointed at a hardcoded file path that was never deployed — root-caused it
  via direct browser inspection (video element state, network response)
  rather than guessing, then fixed it to just play the reel's real video URL

## Notable resources used
- Groq Console (groq.com) — free LLM API
- Pollinations.ai — free image generation
- Piper TTS (GitHub: rhasspy/piper) — free local TTS
- Pixabay Music — royalty-free background tracks
- Railway, Vercel, Cloudflare R2 — free/low-cost hosting tiers

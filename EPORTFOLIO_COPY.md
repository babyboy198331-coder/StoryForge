# Eportfolio restructure — copy to drop in

## Structure
1. **Hero / Original Build** → StoryForge
2. **Recent Work** → OfferBound, ai-chat-interface, Mini Expense Tracker
3. **Earlier Work** → Skinstric AI (internship), CineGalaxy
4. **Cut**: NFT Marketplace, Summarist
5. Per-project tech-badge images can come off each card — they're redundant with the tech ticker already running on the page.

---

## Hero / Original Build

**StoryForge**
*NODE.JS · NEXT.JS · TYPESCRIPT · GROQ/LLAMA · FFMPEG · POSTGRESQL · CLOUDFLARE R2 · RAILWAY · VERCEL*

An AI pipeline that turns a one-line pitch into a fully-produced vertical video reel — a generated script, comic-style scene art, narration, captions, and an FFmpeg-assembled video — deployed across three cloud providers (Vercel, Railway, Cloudflare R2) with Postgres-backed storage.

---

## Recent Work

**OfferBound**
*REACT · FIREBASE · FIRESTORE*
A full-stack job-application tracker designed and built from scratch — Google auth, a live stats dashboard, and follow-up reminders.

**ai-chat-interface**
*NEXT.JS · REACT · TYPESCRIPT · TAILWIND · OPENAI API*
A chat interface built from scratch around the OpenAI API — not a UI clone, an original integration handling request/response state, streaming-style UX, and responsive styling.

**Mini Expense Tracker**
*EXPRESS · POSTGRESQL · JWT · BCRYPT · RENDER · GITHUB PAGES*
A small full-stack app for tracking expenses, built to go deep on auth: bcrypt password hashing, short-lived access tokens paired with rotating refresh tokens, a forgot/reset-password flow with one-time tokens, and protected routes scoped per-user. Backend on Render with a Render-managed Postgres database; frontend on GitHub Pages.

---

## Earlier Work

**Skinstric AI** *(Internship)*
*REACT · VITE · REST APIS · GETUSERMEDIA*
An AI skin-analysis platform built to a pixel-perfect Figma spec with a reusable component library — live selfie or photo upload, base64-encoded to an AI API, results rendered in an interactive demographics dashboard. Fully responsive, shipped through CI/CD to Vercel.

**CineGalaxy**
*NEXT.JS · REACT · TYPESCRIPT · TAILWIND*
A movie-browsing app with server-side initial data fetching and a production Vercel workflow.

---

## About section — add/update

Add a line or short paragraph along these lines (tune to your voice):

> Lately I've been pushing further into the backend and infra side: designing schemas and writing queries in PostgreSQL, deploying services across Railway and Render, and using Cloudflare R2 for object storage. I've also built real auth from scratch — JWT access/refresh token rotation, bcrypt hashing, one-time password-reset tokens — rather than relying on a drop-in auth provider for everything.

This directly backs up Mini Expense Tracker (Postgres + JWT) and StoryForge (Postgres + Railway + R2), so it reads as demonstrated skill, not a buzzword list.

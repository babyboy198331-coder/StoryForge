import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import storyRouter from "./routes/story.js";
import reelsRouter from "./routes/reels.js";
import adminRouter, { seedFeaturedReel } from "./routes/admin.js";

const app = express();
const PORT = process.env.PORT || 4000;

// Restrict to the deployed frontend's origin(s) in production via FRONTEND_URL
// (comma-separated if you have more than one, e.g.
// "https://storyforge.vercel.app,https://staging.storyforge.vercel.app").
// Falls back to allowing any origin when unset, which is fine for local dev
// but should be set once this is publicly deployed.
const FRONTEND_URL = process.env.FRONTEND_URL;
const allowedOrigins = FRONTEND_URL
  ? FRONTEND_URL.split(",").map((s) => s.trim()).filter(Boolean)
  : [];

// Vercel also gives every individual deployment of this project its own
// unique URL (e.g. story-forge-<hash>-<team>.vercel.app) separate from the
// stable production domain set above. Allow those too, so CORS doesn't break
// just because someone opens a deployment-specific link (which Vercel shows
// after every deploy) instead of the production URL.
const VERCEL_PREVIEW_PATTERN = /^https:\/\/story-forge-[a-z0-9]+-babyboy198331-coders-projects\.vercel\.app$/;

app.use(
  cors(
    allowedOrigins.length
      ? {
          origin(origin, callback) {
            if (!origin || allowedOrigins.includes(origin) || VERCEL_PREVIEW_PATTERN.test(origin)) {
              callback(null, true);
            } else {
              callback(new Error("Not allowed by CORS"));
            }
          },
        }
      : {}
  )
);
app.use(express.json());

// Serve generated videos/images so the frontend can play/display them directly.
// no-store so regenerated output.mp4 files are always fetched fresh (not
// served from browser or CDN cache after a rebuild).
app.use("/media", express.static(path.join(process.cwd(), "storage"), {
  setHeaders(res) {
    res.setHeader("Cache-Control", "no-store");
  },
}));

app.use("/api/story", storyRouter);
app.use("/api/reels", reelsRouter);
app.use("/api/admin", adminRouter);

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`StoryForge backend running on http://localhost:${PORT}`);
  seedFeaturedReel()
    .then(({ id, r2 }) =>
      console.log(`Pinned reel seeded (id=${id}, r2=${r2})`)
    )
    .catch((err) =>
      console.warn(`Pinned reel seed skipped: ${err.message}`)
    );
});

import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import storyRouter from "./routes/story.js";
import reelsRouter from "./routes/reels.js";

const app = express();
const PORT = process.env.PORT || 4000;

// Restrict to the deployed frontend's origin in production via FRONTEND_URL
// (e.g. https://storyforge.vercel.app). Falls back to allowing any origin
// when unset, which is fine for local dev but should be set once this is
// publicly deployed.
const FRONTEND_URL = process.env.FRONTEND_URL;
app.use(cors(FRONTEND_URL ? { origin: FRONTEND_URL } : {}));
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

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`StoryForge backend running on http://localhost:${PORT}`);
});

import express from "express";
import { generateStory } from "../services/groq.js";

const router = express.Router();

// POST /api/story  { prompt, genre }
router.post("/", async (req, res) => {
  try {
    const { prompt, genre } = req.body;
    if (!prompt) return res.status(400).json({ error: "prompt is required" });

    const story = await generateStory(prompt, genre);
    res.json(story);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;

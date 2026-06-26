"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface Props {
  src: string;
  poster: string;
  reelId: string;
  title: string;
  hook: string;
  hashtags: string[];
  techPills: string[];
}

export default function FeaturedVideo({
  src,
  poster,
  reelId,
  title,
  hook,
  hashtags,
  techPills,
}: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    v.play().catch(() => {});
  }, []);

  function toggleSound() {
    const v = ref.current;
    if (!v) return;
    if (v.paused) {
      v.muted = true;
      v.play().catch(() => {});
    } else {
      const next = !v.muted;
      v.muted = next;
      setMuted(next);
    }
  }

  return (
    <section className="home-hero">
      <div className="featured-video-frame">
        <video
          ref={ref}
          src={src}
          poster={poster}
          muted
          autoPlay
          loop
          playsInline
          preload="auto"
        />
        <button type="button" className="featured-sound-btn" onClick={toggleSound}>
          {muted ? "🔇 Tap for sound" : "🔊 Sound on"}
        </button>
      </div>

      <div className="featured-info">
        <div>
          <p className="app-eyebrow">AI · Full-Stack · Video</p>
          <h1 className="app-tagline">
            One prompt.<br />Full short drama.
          </h1>
          <p className="app-description">
            StoryForge turns a single pitch into a complete vertical reel —
            AI-written script, comic-style panel art, neural narration, and an
            FFmpeg-assembled video. No paid video APIs. Runs entirely on
            free-tier services.
          </p>
        </div>

        <div className="tech-pills">
          {techPills.map((t) => (
            <span key={t} className="tech-pill">{t}</span>
          ))}
        </div>

        <div className="home-divider" />

        <div className="reel-meta-section">
          <p className="reel-meta-eyebrow">Now Playing</p>
          <h2 className="reel-meta-title">{title}</h2>
          <p className="reel-meta-hook">{hook}</p>
          {hashtags.length > 0 && (
            <p className="reel-meta-tags">
              {hashtags.map((h) => `#${h.replace(/^#/, "")}`).join(" ")}
            </p>
          )}
        </div>

        <div className="reel-actions">
          <Link href={`/reels/${reelId}`} className="btn-secondary">
            ✏ Edit scenes
          </Link>
          <Link href="/generate" className="btn-primary">
            + New Reel
          </Link>
        </div>
      </div>
    </section>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Reel, mediaUrl } from "@/lib/api";

export default function ReelCard({ reel }: { reel: Reel }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.6 }
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  function toggleMute() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }

  const poster = mediaUrl(`/media/${reel.id}/scene-1-start.jpg`);

  return (
    <div className="reel-card">
      <video
        ref={videoRef}
        src={mediaUrl(reel.videoUrl)}
        poster={poster}
        loop
        muted
        playsInline
        preload="metadata"
        onClick={toggleMute}
      />
      <button
        type="button"
        className="mute-toggle"
        onClick={toggleMute}
        aria-label={muted ? "Unmute" : "Mute"}
      >
        {muted ? "🔇" : "🔊"}
      </button>
      <Link href={`/reels/${reel.id}`} className="edit-scenes-link">
        ✏ Edit
      </Link>
      <div className="reel-overlay">
        <div className="reel-title">{reel.title}</div>
        {reel.hook && <div className="reel-hook">{reel.hook}</div>}
        {reel.hashtags?.length > 0 && (
          <div className="reel-hashtags">
            {reel.hashtags.map((h) => `#${h.replace(/^#/, "")}`).join(" ")}
          </div>
        )}
      </div>
    </div>
  );
}

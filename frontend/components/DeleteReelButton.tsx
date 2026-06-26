"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteReel } from "@/lib/api";

export default function DeleteReelButton({ reelId }: { reelId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  function stop(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  async function handleDelete(e: React.MouseEvent) {
    stop(e);
    if (!confirming) { setConfirming(true); return; }
    setBusy(true);
    try {
      await deleteReel(reelId);
      router.refresh();
    } catch {
      setBusy(false);
      setConfirming(false);
    }
  }

  function handleCancel(e: React.MouseEvent) {
    stop(e);
    setConfirming(false);
  }

  if (confirming) {
    return (
      <div className="delete-confirm" onClick={stop}>
        <button className="delete-confirm-yes" onClick={handleDelete} disabled={busy}>
          {busy ? "…" : "Delete"}
        </button>
        <button className="delete-confirm-no" onClick={handleCancel}>Cancel</button>
      </div>
    );
  }

  return (
    <button
      className="delete-reel-btn"
      onClick={handleDelete}
      title="Delete reel"
      aria-label="Delete reel"
    >
      ×
    </button>
  );
}

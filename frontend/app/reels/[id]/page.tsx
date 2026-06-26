import Link from "next/link";
import { fetchReel, mediaUrl } from "@/lib/api";
import RegenerateSceneButton from "@/components/RegenerateSceneButton";

export const dynamic = "force-dynamic";

export default async function ReelEditPage({
  params,
}: {
  params: { id: string };
}) {
  let reel;
  try {
    reel = await fetchReel(params.id);
  } catch {
    return (
      <div className="reel-edit-page">
        <Link href="/" className="reel-edit-back">
          ← Back
        </Link>
        <h1 className="reel-edit-title">Reel not found</h1>
        <p className="reel-edit-hook">
          This reel may have been deleted or the backend is offline.
        </p>
      </div>
    );
  }

  return (
    <div className="reel-edit-page">
      <Link href="/" className="reel-edit-back">
        ← Back to feed
      </Link>

      <h1 className="reel-edit-title">{reel.title}</h1>
      <p className="reel-edit-hook">{reel.hook}</p>

      <div className="reel-edit-preview-wrap">
        <video
          className="reel-edit-preview"
          src={mediaUrl(reel.videoUrl)}
          controls
          playsInline
        />
        <a
          href={mediaUrl(reel.videoUrl)}
          download={`${reel.title.replace(/[^a-z0-9]/gi, "-")}.mp4`}
          className="btn-download"
        >
          ↓ Download MP4
        </a>
      </div>

      <p className="section-heading">Scenes</p>
      <p className="section-hint">
        Regenerating a scene keeps the character sheet and style consistent,
        then re-renders only that clip before reassembling the full reel.
      </p>

      <div className="scene-list">
        {reel.scenes.map((scene) => {
          const sceneAny = scene as any;
          const image =
            sceneAny.imageUrlStart ||
            sceneAny.imageUrl ||
            mediaUrl(`/media/${reel.id}/scene-${scene.scene}-start.jpg`);
          return (
            <div key={scene.scene} className="scene-row">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image}
                alt={`Scene ${scene.scene}`}
                className="scene-thumb"
              />
              <div className="scene-info">
                <span className="scene-number">Scene {scene.scene}</span>
                <p className="scene-narration">{scene.narration}</p>
                <RegenerateSceneButton
                  reelId={reel.id}
                  sceneNumber={scene.scene}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

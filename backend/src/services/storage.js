import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";

// Cloudflare R2 is S3-compatible, so the regular AWS S3 SDK works against it -
// just point the endpoint at the account's R2 URL instead of AWS. Used to
// store the final rendered reel (output.mp4) so it survives Railway
// redeploys/restarts and is served from R2's edge instead of through our own
// backend's bandwidth.
//
// All of this is optional: if the R2 env vars aren't set (e.g. local dev),
// uploadOutputVideo() returns null and the caller falls back to serving the
// file from local disk via the existing /media static route.
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
// Public base URL for the bucket - either the default *.r2.dev dev URL
// (enable "Public Access" on the bucket to get one) or a custom domain
// mapped to the bucket. No trailing slash.
const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL || "").replace(/\/+$/, "");

export const R2_ENABLED = Boolean(
  R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET_NAME && R2_PUBLIC_URL
);

let client = null;
function getClient() {
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return client;
}

// Uploads a local file to R2 under `key` and returns its public URL, or null
// if R2 isn't configured. Logs and returns null on failure too, rather than
// throwing - losing the upload shouldn't fail the whole generation pipeline,
// since the file still exists locally and the API can fall back to /media.
export async function uploadToR2(localPath, key, contentType) {
  if (!R2_ENABLED) return null;

  try {
    const body = fs.readFileSync(localPath);
    await getClient().send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
    );
    return `${R2_PUBLIC_URL}/${key}`;
  } catch (err) {
    console.error(`R2 upload failed for ${key}:`, err.message);
    return null;
  }
}

// Convenience wrapper for the one file the frontend actually needs served
// durably/publicly: a reel's finished output.mp4.
export function uploadOutputVideo(localPath, reelId) {
  return uploadToR2(localPath, `${reelId}/output.mp4`, "video/mp4");
}

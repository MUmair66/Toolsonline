import "server-only";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL } = process.env;

export const r2Enabled = !!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET && R2_PUBLIC_URL);

let client: S3Client | null = null;
function r2() {
  client ??= new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID!, secretAccessKey: R2_SECRET_ACCESS_KEY! },
  });
  return client;
}

/**
 * Resizes (max 1600px), converts to WebP and stores an uploaded image.
 * Uses Cloudflare R2 when configured, otherwise the local ./uploads folder (dev only).
 * Returns the public URL.
 */
export async function storeImage(input: Buffer, folder = "products") {
  const image = sharp(input, { failOn: "error" }).rotate(); // respect phone camera orientation
  const meta = await image.metadata();
  const body = await image
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;

  if (r2Enabled) {
    const key = `${folder}/${name}`;
    await r2().send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: body,
        ContentType: "image/webp",
        CacheControl: "public, max-age=31536000, immutable",
      })
    );
    return { url: `${R2_PUBLIC_URL!.replace(/\/$/, "")}/${key}`, width: meta.width, bytes: body.length };
  }

  const dir = path.join(process.cwd(), "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), body);
  return { url: `/api/uploads/${name}`, width: meta.width, bytes: body.length };
}

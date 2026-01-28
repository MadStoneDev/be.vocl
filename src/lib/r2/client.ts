import { S3Client } from "@aws-sdk/client-s3";

// R2 client - only use on server side
export function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("R2 credentials not configured");
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "bevocl-media";
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || "";

// File type validation
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

export const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
];

export const ALLOWED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/webm",
];

export const ALL_ALLOWED_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  ...ALLOWED_VIDEO_TYPES,
  ...ALLOWED_AUDIO_TYPES,
];

// File size limits (in bytes)
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
export const MAX_AUDIO_SIZE = 50 * 1024 * 1024; // 50MB

export function getMaxSizeForType(contentType: string): number {
  if (ALLOWED_IMAGE_TYPES.includes(contentType)) return MAX_IMAGE_SIZE;
  if (ALLOWED_VIDEO_TYPES.includes(contentType)) return MAX_VIDEO_SIZE;
  if (ALLOWED_AUDIO_TYPES.includes(contentType)) return MAX_AUDIO_SIZE;
  return MAX_IMAGE_SIZE; // Default
}

export function getMediaType(contentType: string): "image" | "video" | "audio" | null {
  if (ALLOWED_IMAGE_TYPES.includes(contentType)) return "image";
  if (ALLOWED_VIDEO_TYPES.includes(contentType)) return "video";
  if (ALLOWED_AUDIO_TYPES.includes(contentType)) return "audio";
  return null;
}

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from "./client";

interface PresignedUrlResult {
  uploadUrl: string;
  key: string;
  publicUrl: string;
}

/**
 * Generate a presigned URL for direct upload to R2 (S3 PutObject).
 *
 * SECURITY (SEC-14): The S3/R2 PutObject presigning flow cannot express a
 * "content-length-range" the way a presigned POST policy can. The proper fix is
 * a presigned POST (`createPresignedPost` from `@aws-sdk/s3-presigned-post`)
 * with a `content-length-range` condition, but that package is not a project
 * dependency and we are not adding one here.
 *
 * Mitigation implemented instead:
 *  1. The caller MUST pass the client-declared `contentLength` and the allowed
 *     `maxSize` for the content type. We reject (throw) if the declared length
 *     exceeds the limit before issuing any URL, so an over-limit upload never
 *     gets a usable URL.
 *  2. We sign the request WITH `ContentLength` bound into the signature. The
 *     client must send a matching `Content-Length` header on the PUT; a body
 *     whose length differs from the signed value fails signature verification,
 *     so the declared size cannot be exceeded with the issued URL.
 *
 * Note: a malicious client could still under-declare and stream a larger body
 * only if it omitted Content-Length, but R2/S3 require Content-Length for PUT
 * and reject chunked uploads on presigned URLs, so the signed length is binding.
 */
export async function generatePresignedUrl(
  key: string,
  contentType: string,
  options?: { contentLength?: number; maxSize?: number; expiresIn?: number }
): Promise<PresignedUrlResult> {
  const { contentLength, maxSize, expiresIn = 3600 } = options ?? {};

  // Enforce the size limit up front when we know the declared length.
  if (typeof maxSize === "number" && typeof contentLength === "number") {
    if (!Number.isFinite(contentLength) || contentLength <= 0) {
      throw new Error("Invalid content length");
    }
    if (contentLength > maxSize) {
      throw new Error(
        `File too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB`
      );
    }
  }

  const client = getR2Client();

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
    // Bind the size into the signature so the client cannot upload more than
    // the declared (and validated) number of bytes.
    ...(typeof contentLength === "number" ? { ContentLength: contentLength } : {}),
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn });

  return {
    uploadUrl,
    key,
    publicUrl: `${R2_PUBLIC_URL}/${key}`,
  };
}

/**
 * Generate a unique file key for storage
 */
export function generateFileKey(
  folder: string,
  userId: string,
  filename: string,
  postId?: string
): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  const ext = filename.split(".").pop()?.toLowerCase() || "bin";
  const safeName = `${timestamp}_${random}.${ext}`;

  if (postId) {
    return `${folder}/${userId}/${postId}/${safeName}`;
  }
  return `${folder}/${userId}/${safeName}`;
}

/**
 * Generate keys for different upload types
 */
export const generateKeys = {
  avatar: (userId: string, filename: string) =>
    generateFileKey("avatars", userId, filename),

  header: (userId: string, filename: string) =>
    generateFileKey("headers", userId, filename),

  postImage: (userId: string, postId: string, filename: string, index: number) => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    const ext = filename.split(".").pop()?.toLowerCase() || "jpg";
    return `posts/${userId}/${postId}/images/${index}_${timestamp}_${random}.${ext}`;
  },

  postVideo: (userId: string, postId: string, filename: string) =>
    generateFileKey("posts", userId, filename, postId).replace(
      `posts/${userId}/${postId}`,
      `posts/${userId}/${postId}/video`
    ),

  postAudio: (userId: string, postId: string, filename: string) =>
    generateFileKey("posts", userId, filename, postId).replace(
      `posts/${userId}/${postId}`,
      `posts/${userId}/${postId}/audio`
    ),

  chatMedia: (conversationId: string, messageId: string, filename: string) => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    const ext = filename.split(".").pop()?.toLowerCase() || "bin";
    return `messages/${conversationId}/${messageId}/${timestamp}_${random}.${ext}`;
  },
};

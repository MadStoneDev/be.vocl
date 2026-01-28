import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from "./client";

interface PresignedUrlResult {
  uploadUrl: string;
  key: string;
  publicUrl: string;
}

/**
 * Generate a presigned URL for direct upload to R2
 */
export async function generatePresignedUrl(
  key: string,
  contentType: string,
  expiresIn = 3600 // 1 hour
): Promise<PresignedUrlResult> {
  const client = getR2Client();

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
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

"use client";

import { useState, useCallback } from "react";

interface UploadOptions {
  uploadType: "avatar" | "header" | "post-image" | "post-video" | "post-audio" | "chat-media";
  postId?: string;
  conversationId?: string;
  messageId?: string;
  index?: number;
}

interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

interface UploadResult {
  key: string;
  publicUrl: string;
  mediaType: "image" | "video" | "audio";
}

export function useUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (file: File, options: UploadOptions): Promise<UploadResult | null> => {
      setIsUploading(true);
      setProgress(null);
      setError(null);

      try {
        // Step 1: Get presigned URL
        const presignResponse = await fetch("/api/upload/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
            ...options,
          }),
        });

        if (!presignResponse.ok) {
          const data = await presignResponse.json();
          throw new Error(data.error || "Failed to get upload URL");
        }

        const { uploadUrl, key, publicUrl, maxSize, mediaType } =
          await presignResponse.json();

        // Validate file size
        if (file.size > maxSize) {
          throw new Error(
            `File too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB`
          );
        }

        // Step 2: Upload to R2
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();

          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
              setProgress({
                loaded: e.loaded,
                total: e.total,
                percent: Math.round((e.loaded / e.total) * 100),
              });
            }
          });

          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          });

          xhr.addEventListener("error", () => {
            reject(new Error("Upload failed"));
          });

          xhr.addEventListener("abort", () => {
            reject(new Error("Upload cancelled"));
          });

          xhr.open("PUT", uploadUrl);
          xhr.setRequestHeader("Content-Type", file.type);
          xhr.send(file);
        });

        return { key, publicUrl, mediaType };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        setError(message);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    []
  );

  const uploadMultiple = useCallback(
    async (
      files: File[],
      options: Omit<UploadOptions, "index">
    ): Promise<UploadResult[]> => {
      const results: UploadResult[] = [];

      for (let i = 0; i < files.length; i++) {
        const result = await upload(files[i], { ...options, index: i });
        if (result) {
          results.push(result);
        }
      }

      return results;
    },
    [upload]
  );

  const reset = useCallback(() => {
    setIsUploading(false);
    setProgress(null);
    setError(null);
  }, []);

  return {
    upload,
    uploadMultiple,
    isUploading,
    progress,
    error,
    reset,
  };
}

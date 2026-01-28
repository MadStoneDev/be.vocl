"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import {
  IconUpload,
  IconX,
  IconPhoto,
  IconVideo,
  IconMusic,
  IconLoader2,
} from "@tabler/icons-react";
import { useUpload } from "@/hooks/useUpload";

interface MediaUploaderProps {
  postId: string;
  mediaType: "image" | "video" | "audio";
  onUploadComplete: (urls: string[]) => void;
  maxFiles?: number;
  existingUrls?: string[];
}

export function MediaUploader({
  postId,
  mediaType,
  onUploadComplete,
  maxFiles = 10,
  existingUrls = [],
}: MediaUploaderProps) {
  const { upload, isUploading, progress, error } = useUpload();
  const [uploadedUrls, setUploadedUrls] = useState<string[]>(existingUrls);
  const [dragOver, setDragOver] = useState(false);

  const acceptTypes = {
    image: "image/jpeg,image/png,image/gif,image/webp",
    video: "video/mp4,video/webm,video/quicktime",
    audio: "audio/mpeg,audio/wav,audio/ogg,audio/webm",
  };

  const uploadTypeMap = {
    image: "post-image" as const,
    video: "post-video" as const,
    audio: "post-audio" as const,
  };

  const handleFiles = useCallback(
    async (files: FileList) => {
      const fileArray = Array.from(files).slice(0, maxFiles - uploadedUrls.length);
      const newUrls: string[] = [];

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        const result = await upload(file, {
          uploadType: uploadTypeMap[mediaType],
          postId,
          index: uploadedUrls.length + i,
        });

        if (result) {
          newUrls.push(result.publicUrl);
        }
      }

      if (newUrls.length > 0) {
        const allUrls = [...uploadedUrls, ...newUrls];
        setUploadedUrls(allUrls);
        onUploadComplete(allUrls);
      }
    },
    [upload, postId, mediaType, maxFiles, uploadedUrls, onUploadComplete]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const handleRemove = (index: number) => {
    const newUrls = uploadedUrls.filter((_, i) => i !== index);
    setUploadedUrls(newUrls);
    onUploadComplete(newUrls);
  };

  const Icon = mediaType === "video" ? IconVideo : mediaType === "audio" ? IconMusic : IconPhoto;

  return (
    <div className="space-y-4">
      {/* Uploaded files preview */}
      {uploadedUrls.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {uploadedUrls.map((url, index) => (
            <div key={url} className="relative group">
              {mediaType === "image" && (
                <div className="relative aspect-square rounded-xl overflow-hidden bg-vocl-surface-dark">
                  <Image src={url} alt="" fill className="object-cover" />
                </div>
              )}
              {mediaType === "video" && (
                <div className="relative aspect-video rounded-xl overflow-hidden bg-vocl-surface-dark">
                  <video src={url} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <IconVideo size={32} className="text-white" />
                  </div>
                </div>
              )}
              {mediaType === "audio" && (
                <div className="relative aspect-square rounded-xl overflow-hidden bg-vocl-surface-dark flex items-center justify-center">
                  <IconMusic size={48} className="text-foreground/40" />
                </div>
              )}
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-vocl-like text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <IconX size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload area */}
      {uploadedUrls.length < maxFiles && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${
            dragOver
              ? "border-vocl-accent bg-vocl-accent/10"
              : "border-white/10 hover:border-white/20"
          }`}
        >
          <input
            type="file"
            accept={acceptTypes[mediaType]}
            multiple={mediaType === "image"}
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isUploading}
          />

          {isUploading ? (
            <div className="space-y-3">
              <IconLoader2 size={40} className="mx-auto text-vocl-accent animate-spin" />
              <p className="text-foreground/60">
                Uploading... {progress?.percent || 0}%
              </p>
              <div className="w-48 h-1.5 mx-auto bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-vocl-accent transition-all"
                  style={{ width: `${progress?.percent || 0}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="w-16 h-16 mx-auto rounded-full bg-vocl-accent/10 flex items-center justify-center">
                <Icon size={32} className="text-vocl-accent" />
              </div>
              <div>
                <p className="text-foreground font-medium">
                  Drop {mediaType === "image" ? "images" : mediaType === "video" ? "a video" : "an audio file"} here
                </p>
                <p className="text-foreground/40 text-sm mt-1">
                  or click to browse
                </p>
              </div>
              {mediaType === "image" && (
                <p className="text-foreground/30 text-xs">
                  Up to {maxFiles} images • JPG, PNG, GIF, WebP
                </p>
              )}
              {mediaType === "video" && (
                <p className="text-foreground/30 text-xs">
                  MP4, WebM • Max 100MB
                </p>
              )}
              {mediaType === "audio" && (
                <p className="text-foreground/30 text-xs">
                  MP3, WAV, OGG • Max 50MB
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-vocl-like text-sm">{error}</p>
      )}
    </div>
  );
}

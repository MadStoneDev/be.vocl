"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import {
  IconUpload,
  IconX,
  IconPhoto,
  IconVideo,
  IconMusic,
  IconLoader2,
  IconGripVertical,
} from "@tabler/icons-react";
import { useUpload } from "@/hooks/useUpload";
import { toast } from "@/components/ui";

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

  // Surface upload failures — otherwise a rejected file (e.g. an unsupported
  // format or empty content-type from a mobile picker) fails silently and it
  // looks like nothing happened after selecting files.
  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);
  const [dragOver, setDragOver] = useState(false);
  // Reorder-by-drag state for the gallery preview.
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleReorderEnd = () => {
    if (
      draggedIndex !== null &&
      dragOverIndex !== null &&
      draggedIndex !== dragOverIndex
    ) {
      const arr = [...uploadedUrls];
      const [moved] = arr.splice(draggedIndex, 1);
      arr.splice(dragOverIndex, 0, moved);
      setUploadedUrls(arr);
      onUploadComplete(arr);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

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
      {/* Reorder hint (galleries only) */}
      {mediaType === "image" && uploadedUrls.length > 1 && (
        <p className="type-meta text-foreground/45">
          Drag to reorder — the first image is the cover.
        </p>
      )}

      {/* Uploaded files preview */}
      {uploadedUrls.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {uploadedUrls.map((url, index) => {
            const reorderable = mediaType === "image" && uploadedUrls.length > 1;
            return (
            <div
              key={url}
              draggable={reorderable}
              onDragStart={reorderable ? () => setDraggedIndex(index) : undefined}
              onDragOver={
                reorderable
                  ? (e) => {
                      e.preventDefault();
                      if (draggedIndex !== null && draggedIndex !== index) {
                        setDragOverIndex(index);
                      }
                    }
                  : undefined
              }
              onDrop={reorderable ? (e) => e.preventDefault() : undefined}
              onDragEnd={reorderable ? handleReorderEnd : undefined}
              className={`relative group transition-all ${
                draggedIndex === index ? "opacity-40" : ""
              } ${dragOverIndex === index ? "ring-2 ring-vocl-primary rounded-xl" : ""}`}
            >
              {mediaType === "image" && (
                <div className="relative aspect-square rounded-xl overflow-hidden bg-vocl-surface-dark">
                  <Image src={url} alt="" fill sizes="(max-width: 640px) 50vw, 200px" className="object-cover" />
                  {reorderable && (
                    <>
                      <span className="absolute top-2 left-2 w-6 h-6 rounded-md bg-black/55 text-white flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity">
                        <IconGripVertical size={15} />
                      </span>
                      <span className="absolute bottom-2 left-2 min-w-[20px] h-5 px-1 rounded-md bg-black/55 text-white type-meta font-semibold flex items-center justify-center">
                        {index + 1}
                      </span>
                    </>
                  )}
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
            );
          })}
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
          className={`relative border-2 border-dashed rounded-sm p-8 text-center transition-colors ${
            dragOver
              ? "border-vocl-primary bg-vocl-primary/10"
              : "border-vocl-border hover:border-vocl-border"
          }`}
        >
          <input
            type="file"
            accept={acceptTypes[mediaType]}
            multiple={mediaType === "image"}
            onChange={(e) => {
              if (e.target.files?.length) handleFiles(e.target.files);
              // Clear the value so re-selecting the same file(s) fires onChange
              // again (mobile: a failed pick otherwise looks permanently dead).
              e.target.value = "";
            }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isUploading}
          />

          {isUploading ? (
            <div className="space-y-3">
              <IconLoader2 size={40} className="mx-auto text-vocl-primary animate-spin" />
              <p className="type-body text-foreground/60">
                Uploading... {progress?.percent || 0}%
              </p>
              <div className="w-48 h-1.5 mx-auto bg-vocl-hover-strong rounded-full overflow-hidden">
                <div
                  className="h-full bg-vocl-primary transition-all"
                  style={{ width: `${progress?.percent || 0}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="w-16 h-16 mx-auto rounded-full bg-vocl-primary/10 flex items-center justify-center">
                <Icon size={32} className="text-vocl-primary" />
              </div>
              <div>
                <p className="type-body text-foreground font-medium">
                  Drop {mediaType === "image" ? "images" : mediaType === "video" ? "a video" : "an audio file"} here
                </p>
                <p className="type-body text-foreground/40 mt-1">
                  or click to browse
                </p>
              </div>
              {mediaType === "image" && (
                <p className="type-meta text-foreground/30">
                  Up to {maxFiles} images • JPG, PNG, GIF, WebP
                </p>
              )}
              {mediaType === "video" && (
                <p className="type-meta text-foreground/30">
                  MP4, WebM • Max 100MB
                </p>
              )}
              {mediaType === "audio" && (
                <p className="type-meta text-foreground/30">
                  MP3, WAV, OGG • Max 50MB
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="type-meta text-vocl-like">{error}</p>
      )}
    </div>
  );
}

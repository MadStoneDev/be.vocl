"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import {
  IconBold,
  IconItalic,
  IconLink,
  IconH2,
  IconQuote,
} from "@tabler/icons-react";
import { isValidUrl } from "@/lib/sanitize";
import { useUpload } from "@/hooks/useUpload";

interface EditorialEditorProps {
  html: string;
  onChange: (html: string, plain: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  /** Post id used for image uploads (drag/drop/paste into the body). */
  uploadPostId?: string;
}

export function EditorialEditor({
  html,
  onChange,
  placeholder = "Start writing…",
  autoFocus = false,
  uploadPostId,
}: EditorialEditorProps) {
  const { upload } = useUpload();
  const [linkPopover, setLinkPopover] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);
  const uploadPostIdRef = useRef(uploadPostId);
  uploadPostIdRef.current = uploadPostId;

  const uploadImageFile = useCallback(
    async (file: File, view: any) => {
      if (!file.type.startsWith("image/")) return;
      const result = await upload(file, {
        uploadType: "post-image",
        postId: uploadPostIdRef.current || undefined,
      });
      if (result?.publicUrl) {
        const { state, dispatch } = view;
        const node = state.schema.nodes.image.create({ src: result.publicUrl });
        const tr = state.tr.replaceSelectionWith(node);
        dispatch(tr);
      }
    },
    [upload]
  );

  const editor = useEditor({
    immediatelyRender: false,
    autofocus: autoFocus ? "end" : false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: false,
        code: false,
        // Blockquote stays ENABLED (StarterKit default) for the pull-quote.
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "editorial-link" },
      }),
      Image.configure({
        HTMLAttributes: { class: "editorial-image" },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: "is-editor-empty",
      }),
    ],
    content: html,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML(), editor.getText());
    },
    editorProps: {
      attributes: {
        class: "editorial-prose focus:outline-none",
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of items) {
          if (item.type.startsWith("image/")) {
            const file = item.getAsFile();
            if (file) {
              event.preventDefault();
              void uploadImageFile(file, view);
              return true;
            }
          }
        }
        return false;
      },
      handleDrop: (view, event) => {
        const files = event.dataTransfer?.files;
        if (!files || files.length === 0) return false;
        const imageFiles = Array.from(files).filter((f) =>
          f.type.startsWith("image/")
        );
        if (imageFiles.length === 0) return false;
        event.preventDefault();
        for (const file of imageFiles) {
          void uploadImageFile(file, view);
        }
        return true;
      },
    },
  });

  // Sync external html into the editor (e.g. when edit mode hydrates).
  useEffect(() => {
    if (editor && html !== undefined && html !== editor.getHTML()) {
      editor.commands.setContent(html, { emitUpdate: false });
    }
  }, [editor, html]);

  useEffect(() => {
    if (linkPopover) {
      // Focus the URL input when the popover opens.
      requestAnimationFrame(() => linkInputRef.current?.focus());
    }
  }, [linkPopover]);

  if (!editor) return null;

  const openLinkPopover = () => {
    const existing = editor.getAttributes("link").href as string | undefined;
    setLinkValue(existing || "");
    setLinkError(null);
    setLinkPopover(true);
  };

  const applyLink = () => {
    const url = linkValue.trim();
    if (!url) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      setLinkPopover(false);
      return;
    }
    if (!isValidUrl(url)) {
      setLinkError("Enter a valid http or https URL");
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    setLinkPopover(false);
  };

  const BtnClass = (active: boolean) =>
    `flex items-center justify-center w-8 h-8 rounded-md transition-colors ${
      active
        ? "bg-[var(--vocl-primary)] text-white"
        : "text-foreground/70 hover:bg-[var(--vocl-hover)] hover:text-foreground"
    }`;

  return (
    <div className="editorial-editor relative">
      <BubbleMenu
        editor={editor}
        options={{ placement: "top" }}
        className="flex items-center gap-0.5 rounded-xl border border-[var(--vocl-border)] bg-vocl-surface-dark/95 backdrop-blur p-1 shadow-xl"
      >
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={BtnClass(editor.isActive("bold"))}
          title="Bold"
        >
          <IconBold size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={BtnClass(editor.isActive("italic"))}
          title="Italic"
        >
          <IconItalic size={16} />
        </button>
        <div className="w-px h-5 bg-[var(--vocl-border)] mx-0.5" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={BtnClass(editor.isActive("heading", { level: 2 }))}
          title="Heading"
        >
          <IconH2 size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={BtnClass(editor.isActive("blockquote"))}
          title="Pull quote"
        >
          <IconQuote size={16} />
        </button>
        <button
          type="button"
          onClick={openLinkPopover}
          className={BtnClass(editor.isActive("link"))}
          title="Link"
        >
          <IconLink size={16} />
        </button>
      </BubbleMenu>

      {/* Inline link popover (replaces window.prompt) */}
      {linkPopover && (
        <div className="absolute z-50 top-0 left-0 right-0 flex items-center gap-2 rounded-xl border border-[var(--vocl-border)] bg-vocl-surface-dark p-2 shadow-xl">
          <input
            ref={linkInputRef}
            type="url"
            value={linkValue}
            onChange={(e) => {
              setLinkValue(e.target.value);
              setLinkError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyLink();
              } else if (e.key === "Escape") {
                setLinkPopover(false);
              }
            }}
            placeholder="https://example.com"
            className="flex-1 bg-transparent px-2 py-1.5 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none"
          />
          <button
            type="button"
            onClick={applyLink}
            className="px-3 py-1.5 rounded-lg bg-[var(--vocl-primary)] text-white text-sm font-medium hover:bg-[var(--vocl-primary-hover)] transition-colors"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={() => setLinkPopover(false)}
            className="px-2 py-1.5 rounded-lg text-foreground/60 hover:text-foreground text-sm"
          >
            Cancel
          </button>
          {linkError && (
            <span className="absolute -bottom-5 left-2 text-xs text-[var(--vocl-primary)]">
              {linkError}
            </span>
          )}
        </div>
      )}

      <EditorContent editor={editor} />

      <style jsx global>{`
        .editorial-prose {
          color: var(--foreground);
        }
        .editorial-prose:focus {
          outline: none;
        }
        .editorial-prose p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: var(--foreground);
          opacity: 0.35;
          pointer-events: none;
          height: 0;
        }
        .editorial-prose p {
          margin: 0 0 1.1em;
          font-size: 1.0625rem;
          line-height: 1.75;
        }
        .editorial-prose p:last-child {
          margin-bottom: 0;
        }
        .editorial-prose h2 {
          font-family: var(--font-display);
          font-weight: 400;
          font-size: 1.6rem;
          line-height: 1.2;
          letter-spacing: -0.01em;
          margin: 1.4em 0 0.5em;
        }
        .editorial-prose h3 {
          font-family: var(--font-display);
          font-weight: 400;
          font-size: 1.3rem;
          line-height: 1.25;
          margin: 1.2em 0 0.4em;
        }
        .editorial-prose blockquote {
          font-family: var(--font-display);
          font-weight: 400;
          font-size: clamp(1.25rem, 1.05rem + 0.8vw, 1.6rem);
          line-height: 1.4;
          border-left: 3px solid var(--vocl-primary);
          padding-left: 1.1em;
          margin: 1.3em 0;
          color: var(--foreground);
          opacity: 0.92;
        }
        .editorial-prose a.editorial-link {
          color: var(--vocl-primary);
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .editorial-prose ul,
        .editorial-prose ol {
          padding-left: 1.5em;
          margin: 0 0 1.1em;
        }
        .editorial-prose ul {
          list-style-type: disc;
        }
        .editorial-prose ol {
          list-style-type: decimal;
        }
        .editorial-prose li {
          margin: 0.25em 0;
        }
        .editorial-prose img.editorial-image {
          max-width: 100%;
          height: auto;
          border-radius: 0.75rem;
          margin: 1.2em 0;
        }
        .editorial-prose strong {
          font-weight: 700;
        }
      `}</style>
    </div>
  );
}

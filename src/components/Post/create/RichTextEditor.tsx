"use client";

import { useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
  IconBold,
  IconItalic,
  IconStrikethrough,
  IconLink,
  IconLinkOff,
  IconList,
  IconListNumbers,
  IconCheck,
  IconX,
} from "@tabler/icons-react";
import { isValidUrl } from "@/lib/sanitize";

interface RichTextEditorProps {
  content?: string;
  onChange?: (html: string, plainText: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export function RichTextEditor({
  content = "",
  onChange,
  placeholder = "What's on your mind?",
  minHeight = "150px",
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        code: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-vocl-primary underline",
        },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: "is-editor-empty",
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const plainText = editor.getText();
      onChange?.(html, plainText);
    },
    editorProps: {
      attributes: {
        class: "prose prose-invert max-w-none focus:outline-none focus:ring-0",
        style: `min-height: ${minHeight}`,
      },
    },
  });

  // Inline link editor (replaces window.prompt / window.alert).
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);

  // Sync content prop into the editor when it changes externally
  // (e.g. when EditPostModal loads existing post data after mount)
  useEffect(() => {
    if (editor && content !== undefined && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [editor, content]);

  if (!editor) return null;

  const ToolbarButton = ({
    onClick,
    isActive,
    children,
    title,
  }: {
    onClick: () => void;
    isActive?: boolean;
    children: React.ReactNode;
    title: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-2 rounded-lg transition-colors ${
        isActive
          ? "bg-vocl-primary text-white"
          : "text-foreground/60 hover:text-foreground hover:bg-vocl-hover"
      }`}
    >
      {children}
    </button>
  );

  const openLink = () => {
    // Pre-fill with the existing link under the cursor, if any.
    setLinkUrl((editor.getAttributes("link").href as string) || "");
    setLinkError(null);
    setLinkOpen(true);
  };

  const closeLink = () => {
    setLinkOpen(false);
    setLinkUrl("");
    setLinkError(null);
    editor.chain().focus().run();
  };

  const applyLink = () => {
    const url = linkUrl.trim();
    if (!url) {
      closeLink();
      return;
    }
    // Validate to prevent XSS via javascript: / data: protocols.
    if (!isValidUrl(url)) {
      setLinkError("Enter a valid http:// or https:// URL.");
      return;
    }
    editor.chain().focus().setLink({ href: url }).run();
    closeLink();
  };

  const removeLink = () => {
    editor.chain().focus().unsetLink().run();
    closeLink();
  };

  return (
    <div className="rounded-sm border border-vocl-border overflow-hidden has-[:focus]:ring-2 has-[:focus]:ring-vocl-primary has-[:focus]:border-vocl-primary transition-colors">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-vocl-border bg-vocl-surface-dark/50">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")}
          title="Bold"
        >
          <IconBold size={18} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")}
          title="Italic"
        >
          <IconItalic size={18} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive("strike")}
          title="Strikethrough"
        >
          <IconStrikethrough size={18} />
        </ToolbarButton>
        <div className="w-px h-5 bg-vocl-border mx-1" />
        <ToolbarButton
          onClick={openLink}
          isActive={editor.isActive("link") || linkOpen}
          title="Add link"
        >
          <IconLink size={18} />
        </ToolbarButton>
        <div className="w-px h-5 bg-vocl-border mx-1" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive("bulletList")}
          title="Bullet list"
        >
          <IconList size={18} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive("orderedList")}
          title="Numbered list"
        >
          <IconListNumbers size={18} />
        </ToolbarButton>
      </div>

      {/* Inline link editor (replaces the browser prompt) */}
      {linkOpen && (
        <div className="border-b border-vocl-border bg-vocl-surface-dark/50 p-2">
          <div className="flex items-center gap-1.5">
            <input
              type="url"
              inputMode="url"
              autoFocus
              value={linkUrl}
              onChange={(e) => {
                setLinkUrl(e.target.value);
                if (linkError) setLinkError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyLink();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  closeLink();
                }
              }}
              placeholder="https://example.com"
              className="min-w-0 flex-1 rounded-lg border border-vocl-border bg-background px-3 py-1.5 type-body text-foreground outline-none transition-colors placeholder:text-foreground/40 focus:border-vocl-primary"
            />
            <button
              type="button"
              onClick={applyLink}
              title="Apply link"
              className="flex-shrink-0 rounded-lg bg-vocl-primary p-2 text-white transition-opacity hover:opacity-90"
            >
              <IconCheck size={18} />
            </button>
            {editor.isActive("link") && (
              <button
                type="button"
                onClick={removeLink}
                title="Remove link"
                className="flex-shrink-0 rounded-lg p-2 text-foreground/60 transition-colors hover:bg-vocl-hover hover:text-vocl-like"
              >
                <IconLinkOff size={18} />
              </button>
            )}
            <button
              type="button"
              onClick={closeLink}
              title="Cancel"
              className="flex-shrink-0 rounded-lg p-2 text-foreground/60 transition-colors hover:bg-vocl-hover hover:text-foreground"
            >
              <IconX size={18} />
            </button>
          </div>
          {linkError && (
            <p className="mt-1.5 pl-1 type-meta text-vocl-like">{linkError}</p>
          )}
        </div>
      )}

      {/* Editor */}
      <div className="p-4 bg-background/50">
        <EditorContent editor={editor} />
      </div>

      <style jsx global>{`
        .ProseMirror:focus {
          outline: none;
          box-shadow: none;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: rgba(255, 255, 255, 0.3);
          pointer-events: none;
          height: 0;
        }
        .ProseMirror p {
          margin: 0.5em 0;
        }
        .ProseMirror p:first-child {
          margin-top: 0;
        }
        .ProseMirror p:last-child {
          margin-bottom: 0;
        }
        .ProseMirror ul,
        .ProseMirror ol {
          padding-left: 1.5em;
          margin: 0.5em 0;
        }
        .ProseMirror ul {
          list-style-type: disc;
        }
        .ProseMirror ol {
          list-style-type: decimal;
        }
        .ProseMirror li {
          margin: 0.25em 0;
        }
      `}</style>
    </div>
  );
}

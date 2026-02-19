"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
  IconBold,
  IconItalic,
  IconStrikethrough,
  IconLink,
  IconList,
  IconListNumbers,
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
          class: "text-vocl-accent underline",
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
          ? "bg-vocl-accent text-white"
          : "text-foreground/60 hover:text-foreground hover:bg-white/5"
      }`}
    >
      {children}
    </button>
  );

  const addLink = () => {
    const url = window.prompt("Enter URL:");
    if (url) {
      // Validate URL to prevent XSS via javascript: or data: protocols
      if (!isValidUrl(url)) {
        window.alert("Invalid URL. Please enter a valid http or https URL.");
        return;
      }
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 overflow-hidden has-[:focus]:ring-2 has-[:focus]:ring-vocl-accent has-[:focus]:border-vocl-accent transition-colors">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-white/10 bg-vocl-surface-dark/50">
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
        <div className="w-px h-5 bg-white/10 mx-1" />
        <ToolbarButton
          onClick={addLink}
          isActive={editor.isActive("link")}
          title="Add link"
        >
          <IconLink size={18} />
        </ToolbarButton>
        <div className="w-px h-5 bg-white/10 mx-1" />
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
        .ProseMirror li {
          margin: 0.25em 0;
        }
      `}</style>
    </div>
  );
}

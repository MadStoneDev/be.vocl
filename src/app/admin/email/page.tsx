"use client";

import { useState, useEffect } from "react";
import {
  IconMail,
  IconSend,
  IconUsers,
  IconTag,
  IconHistory,
  IconLoader2,
  IconPlus,
  IconTrash,
  IconEye,
  IconTemplate,
  IconX,
  IconCheck,
} from "@tabler/icons-react";
import { toast } from "@/components/ui";
import {
  getUserTags,
  createUserTag,
  deleteUserTag,
  getEmailRecipients,
  sendBulkEmail,
  getEmailHistory,
  type UserTag,
  type EmailRecipient,
  type EmailSendRecord,
} from "@/actions/admin-email";

type Tab = "compose" | "templates" | "tags" | "history";
type TemplateType = "announcement" | "founder_message";

export default function AdminEmailPage() {
  const [activeTab, setActiveTab] = useState<Tab>("compose");

  return (
    <div>
      <title>Admin — Email | be.vocl</title>

      {/* Title row */}
      <div className="flex items-end justify-between gap-4 pt-8 pb-4.5">
        <div>
          <div className="kicker kicker-accent mb-2.5">The desk</div>
          <h1 className="type-display text-ink">Email</h1>
        </div>
        <span className="slug text-meta-dim hidden sm:block">Announcements · templates · tags</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-rule pb-3 overflow-x-auto">
        {[
          { id: "compose" as Tab, label: "Compose", icon: IconSend },
          { id: "templates" as Tab, label: "Templates", icon: IconTemplate },
          { id: "tags" as Tab, label: "User Tags", icon: IconTag },
          { id: "history" as Tab, label: "History", icon: IconHistory },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            data-active={activeTab === tab.id}
            className="section-tab flex items-center gap-2 whitespace-nowrap hover:text-ink transition-colors shrink-0"
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="pt-7">
        {activeTab === "compose" && <ComposeTab />}
        {activeTab === "templates" && <TemplatesTab />}
        {activeTab === "tags" && <TagsTab />}
        {activeTab === "history" && <HistoryTab />}
      </div>
    </div>
  );
}

// ============================================================================
// COMPOSE TAB
// ============================================================================

function ComposeTab() {
  const [templateType, setTemplateType] = useState<TemplateType>("announcement");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [founderName, setFounderName] = useState("");
  const [founderTitle, setFounderTitle] = useState("");
  const [signature, setSignature] = useState("");

  const [recipientType, setRecipientType] = useState<"all" | "tags">("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tags, setTags] = useState<UserTag[]>([]);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);

  const [isSending, setIsSending] = useState(false);
  const [isLoadingRecipients, setIsLoadingRecipients] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadTags();
  }, []);

  useEffect(() => {
    loadRecipientCount();
  }, [recipientType, selectedTags]);

  const loadTags = async () => {
    const result = await getUserTags();
    if (result.success && result.tags) {
      setTags(result.tags);
    }
  };

  const loadRecipientCount = async () => {
    setIsLoadingRecipients(true);
    const result = await getEmailRecipients(
      recipientType === "tags" && selectedTags.length > 0
        ? { tagIds: selectedTags }
        : undefined
    );
    if (result.success) {
      setRecipientCount(result.total || 0);
    }
    setIsLoadingRecipients(false);
  };

  const handleSend = async () => {
    if (!subject.trim() || !content.trim()) {
      toast.error("Subject and content are required");
      return;
    }

    if (recipientCount === 0) {
      toast.error("No recipients selected");
      return;
    }

    setIsSending(true);
    const result = await sendBulkEmail({
      templateType,
      subject,
      content,
      recipientFilter: {
        type: recipientType,
        tagIds: recipientType === "tags" ? selectedTags : undefined,
      },
      ctaText: ctaText || undefined,
      ctaUrl: ctaUrl || undefined,
      founderName: founderName || undefined,
      founderTitle: founderTitle || undefined,
      signature: signature || undefined,
    });

    if (result.success) {
      toast.success(`Email sent to ${result.sentCount} recipients`);
      // Reset form
      setSubject("");
      setContent("");
      setCtaText("");
      setCtaUrl("");
    } else {
      toast.error(result.error || "Failed to send email");
    }
    setIsSending(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Compose Form */}
      <div className="space-y-6">
        {/* Template Type */}
        <div>
          <label className="slug text-meta-dim block mb-3">Template Type</label>
          <div className="flex gap-6 border-b border-rule pb-2.5">
            <button
              type="button"
              onClick={() => setTemplateType("announcement")}
              data-active={templateType === "announcement"}
              className="section-tab hover:text-ink transition-colors"
            >
              Announcement
            </button>
            <button
              type="button"
              onClick={() => setTemplateType("founder_message")}
              data-active={templateType === "founder_message"}
              className="section-tab hover:text-ink transition-colors"
            >
              Founder Message
            </button>
          </div>
        </div>

        {/* Recipients */}
        <div>
          <label className="slug text-meta-dim block mb-3">Recipients</label>
          <div className="space-y-3">
            <div className="flex gap-6 border-b border-rule pb-2.5">
              <button
                type="button"
                onClick={() => setRecipientType("all")}
                data-active={recipientType === "all"}
                className="section-tab hover:text-ink transition-colors"
              >
                All Users
              </button>
              <button
                type="button"
                onClick={() => setRecipientType("tags")}
                data-active={recipientType === "tags"}
                className="section-tab hover:text-ink transition-colors"
              >
                By Tag
              </button>
            </div>

            {recipientType === "tags" && (
              <div className="flex flex-wrap gap-2.5">
                {tags.map((tag) => {
                  const isSelected = selectedTags.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => {
                        setSelectedTags((prev) =>
                          prev.includes(tag.id)
                            ? prev.filter((id) => id !== tag.id)
                            : [...prev, tag.id]
                        );
                      }}
                      className={`flex items-center gap-1.5 border px-3 py-1.5 font-sans text-[11px] uppercase tracking-[0.14em] transition-colors ${
                        isSelected
                          ? "border-foreground text-ink"
                          : "border-rule text-meta hover:text-ink"
                      }`}
                    >
                      <span
                        className="inline-block h-2 w-2 flex-none"
                        style={{ backgroundColor: tag.color ?? undefined }}
                      />
                      {tag.name}
                      {tag.userCount !== undefined && (
                        <span className="text-meta-dim">({tag.userCount})</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            <p className="byline text-meta flex items-center gap-1.5">
              {isLoadingRecipients ? (
                <IconLoader2 size={14} className="animate-spin" />
              ) : (
                <IconUsers size={14} />
              )}
              {recipientCount !== null ? `${recipientCount} recipients` : "Loading…"}
            </p>
          </div>
        </div>

        {/* Subject */}
        <div>
          <label className="slug text-meta-dim block mb-2">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Enter email subject…"
            className="w-full border border-rule bg-transparent px-4 py-2.5 font-serif text-[15px] text-ink placeholder:text-meta-dim focus:border-foreground focus:outline-none"
          />
        </div>

        {/* Content */}
        <div>
          <label className="slug text-meta-dim block mb-2">Content</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your message here…"
            rows={8}
            className="w-full resize-none border border-rule bg-transparent px-4 py-2.5 font-serif text-[15px] text-ink placeholder:text-meta-dim focus:border-foreground focus:outline-none"
          />
          <p className="byline text-meta-dim mt-1.5">
            Use line breaks to create paragraphs
          </p>
        </div>

        {/* CTA */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="slug text-meta-dim block mb-2">Button Text (optional)</label>
            <input
              type="text"
              value={ctaText}
              onChange={(e) => setCtaText(e.target.value)}
              placeholder="e.g., Learn More"
              className="w-full border border-rule bg-transparent px-4 py-2.5 font-serif text-[15px] text-ink placeholder:text-meta-dim focus:border-foreground focus:outline-none"
            />
          </div>
          <div>
            <label className="slug text-meta-dim block mb-2">Button URL (optional)</label>
            <input
              type="url"
              value={ctaUrl}
              onChange={(e) => setCtaUrl(e.target.value)}
              placeholder="https://…"
              className="w-full border border-rule bg-transparent px-4 py-2.5 font-serif text-[15px] text-ink placeholder:text-meta-dim focus:border-foreground focus:outline-none"
            />
          </div>
        </div>

        {/* Founder Message specific fields */}
        {templateType === "founder_message" && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="slug text-meta-dim block mb-2">Founder Name</label>
                <input
                  type="text"
                  value={founderName}
                  onChange={(e) => setFounderName(e.target.value)}
                  placeholder="Your name"
                  className="w-full border border-rule bg-transparent px-4 py-2.5 font-serif text-[15px] text-ink placeholder:text-meta-dim focus:border-foreground focus:outline-none"
                />
              </div>
              <div>
                <label className="slug text-meta-dim block mb-2">Title</label>
                <input
                  type="text"
                  value={founderTitle}
                  onChange={(e) => setFounderTitle(e.target.value)}
                  placeholder="e.g., Founder, be.vocl"
                  className="w-full border border-rule bg-transparent px-4 py-2.5 font-serif text-[15px] text-ink placeholder:text-meta-dim focus:border-foreground focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="slug text-meta-dim block mb-2">Custom Signature (optional)</label>
              <textarea
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                placeholder="e.g., Cheers,&#10;John"
                rows={2}
                className="w-full resize-none border border-rule bg-transparent px-4 py-2.5 font-serif text-[15px] text-ink placeholder:text-meta-dim focus:border-foreground focus:outline-none"
              />
            </div>
          </>
        )}

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={() => setShowPreview(true)}
            className="flex flex-1 items-center justify-center gap-2 border border-foreground px-6 py-3 font-sans font-medium uppercase tracking-[0.16em] text-xs text-ink hover:bg-vocl-hover transition-colors"
          >
            <IconEye size={16} />
            Preview
          </button>
          <button
            onClick={handleSend}
            disabled={isSending || !subject || !content || recipientCount === 0}
            className="flex flex-1 items-center justify-center gap-2 bg-accent px-6 py-3 font-sans font-medium uppercase tracking-[0.16em] text-xs text-white hover:opacity-[0.88] transition-opacity disabled:opacity-50"
          >
            {isSending ? (
              <IconLoader2 size={16} className="animate-spin" />
            ) : (
              <IconSend size={16} />
            )}
            Send Email
          </button>
        </div>
      </div>

      {/* Preview Panel */}
      <div className="border border-rule p-6">
        <h3 className="slug text-meta-dim mb-4 flex items-center gap-2">
          <IconEye size={16} />
          Preview
        </h3>
        <div className="bg-[#1a1a1a] p-6 min-h-[400px]">
          <EmailPreview
            templateType={templateType}
            subject={subject}
            content={content}
            ctaText={ctaText}
            ctaUrl={ctaUrl}
            founderName={founderName}
            founderTitle={founderTitle}
            signature={signature}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// EMAIL PREVIEW COMPONENT
// ============================================================================

function EmailPreview({
  templateType,
  subject,
  content,
  ctaText,
  ctaUrl,
  founderName,
  founderTitle,
  signature,
}: {
  templateType: TemplateType;
  subject: string;
  content: string;
  ctaText?: string;
  ctaUrl?: string;
  founderName?: string;
  founderTitle?: string;
  signature?: string;
}) {
  const paragraphs = content.split('\n').filter(p => p.trim());

  return (
    <div className="text-[#ededed] text-sm">
      {/* Logo */}
      <div className="text-center mb-6">
        <img
          src="/bevocl logo.png"
          alt="be.vocl"
          className="h-8 mx-auto"
        />
      </div>

      {/* Badge */}
      <div className="text-center mb-4">
        <span
          className={`inline-block font-sans text-[11px] uppercase tracking-[0.2em] ${
            templateType === "announcement" ? "text-[#5B9A8B]" : "text-[#F59E0B]"
          }`}
        >
          {templateType === "announcement" ? "ANNOUNCEMENT" : `A MESSAGE FROM ${(founderName || "THE FOUNDER").toUpperCase()}`}
        </span>
      </div>

      {/* Subject */}
      <h2 className="font-display text-2xl text-center mb-4">
        {subject || "Your subject here..."}
      </h2>

      {/* Greeting */}
      <p className="mb-4">Hey @username,</p>

      {/* Content */}
      {paragraphs.length > 0 ? (
        paragraphs.map((p, i) => (
          <p key={i} className="mb-4 leading-relaxed">{p}</p>
        ))
      ) : (
        <p className="mb-4 text-[#888888] italic">Your message content...</p>
      )}

      {/* CTA Button */}
      {ctaText && ctaUrl && (
        <div className="text-center my-6">
          <span className="inline-block bg-accent text-white px-6 py-3 font-sans font-medium uppercase tracking-[0.16em] text-xs">
            {ctaText}
          </span>
        </div>
      )}

      {/* Signature */}
      <div className="border-t border-[#2a2a2a] pt-4 mt-6">
        {templateType === "announcement" ? (
          <>
            <p className="text-[#888888]">Thanks for being part of be.vocl!</p>
            <p className="text-[#888888] italic mt-2">— The be.vocl Team</p>
          </>
        ) : (
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#2a2a2a] flex items-center justify-center text-white font-display text-lg">
              {(founderName || "F").charAt(0).toUpperCase()}
            </div>
            <div>
              {signature ? (
                <p className="italic whitespace-pre-line">{signature}</p>
              ) : (
                <>
                  <p className="font-sans font-medium">{founderName || "Founder Name"}</p>
                  <p className="text-[#888888] text-xs">{founderTitle || "Founder, be.vocl"}</p>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// TEMPLATES TAB
// ============================================================================

function TemplatesTab() {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const templates = [
    { id: "welcome", name: "Welcome Email", description: "Sent when a user signs up" },
    { id: "magic_link", name: "Magic Link", description: "Passwordless sign-in link" },
    { id: "password_reset", name: "Password Reset", description: "Password reset link" },
    { id: "follow", name: "New Follower", description: "Someone followed you" },
    { id: "like", name: "Post Liked", description: "Someone liked your post" },
    { id: "comment", name: "New Comment", description: "Someone commented on your post" },
    { id: "reblog", name: "Post Echoed", description: "Someone echoed your post" },
    { id: "message", name: "New Message", description: "You received a message" },
    { id: "mention", name: "Mentioned", description: "Someone mentioned you" },
    { id: "digest", name: "Daily Digest", description: "Daily notification summary" },
    { id: "announcement", name: "Announcement", description: "Platform announcements" },
    { id: "founder_message", name: "Founder Message", description: "Personal message from founder" },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Template List */}
      <div className="lg:col-span-1">
        <h3 className="slug text-meta-dim border-b border-rule pb-2.5 mb-1">Email Templates</h3>
        {templates.map((template) => (
          <button
            key={template.id}
            onClick={() => setSelectedTemplate(template.id)}
            data-active={selectedTemplate === template.id}
            className={`w-full text-left border-b border-rule py-3 transition-colors ${
              selectedTemplate === template.id
                ? "border-l-2 border-l-accent pl-3.5"
                : "pl-0 hover:pl-3.5"
            }`}
          >
            <p className="font-sans text-sm font-medium text-ink">{template.name}</p>
            <p className="editorial-caption text-meta not-italic">{template.description}</p>
          </button>
        ))}
      </div>

      {/* Template Preview */}
      <div className="lg:col-span-2">
        <div className="border border-rule p-6">
          <h3 className="slug text-meta-dim mb-4">
            {selectedTemplate ? "Template Preview" : "Select a template"}
          </h3>
          {selectedTemplate ? (
            <div className="bg-[#1a1a1a] p-6 min-h-[400px] overflow-auto">
              <TemplatePreview templateId={selectedTemplate} />
            </div>
          ) : (
            <p className="editorial-body text-meta text-center py-20">
              Select a template from the list to preview it
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TEMPLATE PREVIEW COMPONENT
// ============================================================================

function TemplatePreview({ templateId }: { templateId: string }) {
  const baseStyles = "text-[#ededed] text-sm";

  const Logo = () => (
    <div className="text-center mb-6">
      <img src="/bevocl logo.png" alt="be.vocl" className="h-8 mx-auto" />
    </div>
  );

  const Footer = () => (
    <div className="border-t border-[#2a2a2a] pt-4 mt-6 text-center text-xs text-[#666]">
      <p>© 2025 be.vocl. All rights reserved.</p>
      <p className="mt-1">
        <span className="text-[#5B9A8B]">Unsubscribe</span> • <span className="text-[#5B9A8B]">Preferences</span>
      </p>
    </div>
  );

  const Button = ({ children }: { children: React.ReactNode }) => (
    <div className="text-center my-6">
      <span className="inline-block bg-accent text-white px-6 py-3 font-sans font-medium uppercase tracking-[0.16em] text-xs">
        {children}
      </span>
    </div>
  );

  switch (templateId) {
    case "welcome":
      return (
        <div className={baseStyles}>
          <Logo />
          <h2 className="font-display text-2xl text-center mb-4">Welcome to be.vocl</h2>
          <p className="mb-4">Hey @username,</p>
          <p className="mb-4 leading-relaxed">
            Welcome to be.vocl! We&apos;re thrilled to have you join our community of creators and voices.
          </p>
          <p className="mb-4 leading-relaxed">
            This is your space to share your voice freely. Post your thoughts, connect with like-minded people, and explore content that resonates with you.
          </p>
          <Button>Complete Your Profile</Button>
          <Footer />
        </div>
      );

    case "magic_link":
      return (
        <div className={baseStyles}>
          <Logo />
          <h2 className="font-display text-2xl text-center mb-4">Sign in to be.vocl</h2>
          <p className="mb-4">Hey there,</p>
          <p className="mb-4 leading-relaxed">
            Click the button below to sign in to your be.vocl account. This link will expire in 1 hour.
          </p>
          <Button>Sign In to be.vocl</Button>
          <p className="text-[#888] text-xs mb-4">
            If you didn&apos;t request this email, you can safely ignore it.
          </p>
          <Footer />
        </div>
      );

    case "password_reset":
      return (
        <div className={baseStyles}>
          <Logo />
          <h2 className="font-display text-2xl text-center mb-4">Reset Your Password</h2>
          <p className="mb-4">Hey @username,</p>
          <p className="mb-4 leading-relaxed">
            We received a request to reset your password. Click the button below to create a new password.
          </p>
          <Button>Reset Password</Button>
          <p className="text-[#888] text-xs mb-4">
            This link will expire in 1 hour. If you didn&apos;t request this, please ignore this email.
          </p>
          <Footer />
        </div>
      );

    case "follow":
      return (
        <div className={baseStyles}>
          <Logo />
          <h2 className="font-display text-2xl text-center mb-4">You have a new follower!</h2>
          <p className="mb-4">Hey @username,</p>
          <div className="flex items-center gap-3 border border-[#2a2a2a] p-4 mb-4">
            <div className="w-12 h-12 bg-[#2a2a2a] flex items-center justify-center text-white font-display">
              J
            </div>
            <div>
              <p className="font-sans font-medium">@johndoe</p>
              <p className="text-[#888] text-xs">started following you</p>
            </div>
          </div>
          <Button>View Profile</Button>
          <Footer />
        </div>
      );

    case "like":
      return (
        <div className={baseStyles}>
          <Logo />
          <h2 className="font-display text-2xl text-center mb-4">Someone liked your post</h2>
          <p className="mb-4">Hey @username,</p>
          <div className="border border-[#2a2a2a] p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-[#2a2a2a] flex items-center justify-center text-white font-display text-sm">
                J
              </div>
              <span className="font-sans font-medium">@johndoe</span>
              <span className="text-[#888]">liked your post</span>
            </div>
            <p className="text-[#888] text-sm italic border-l-2 border-[#5B9A8B] pl-3">
              &quot;This is a preview of your post content that was liked...&quot;
            </p>
          </div>
          <Button>View Post</Button>
          <Footer />
        </div>
      );

    case "comment":
      return (
        <div className={baseStyles}>
          <Logo />
          <h2 className="font-display text-2xl text-center mb-4">New comment on your post</h2>
          <p className="mb-4">Hey @username,</p>
          <div className="border border-[#2a2a2a] p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-[#2a2a2a] flex items-center justify-center text-white font-display text-sm">
                J
              </div>
              <span className="font-sans font-medium">@johndoe</span>
              <span className="text-[#888]">commented</span>
            </div>
            <p className="text-sm leading-relaxed">
              &quot;This is amazing! I love what you shared here. Keep up the great work!&quot;
            </p>
          </div>
          <Button>View Comment</Button>
          <Footer />
        </div>
      );

    case "reblog":
      return (
        <div className={baseStyles}>
          <Logo />
          <h2 className="font-display text-2xl text-center mb-4">Your post was echoed</h2>
          <p className="mb-4">Hey @username,</p>
          <div className="border border-[#2a2a2a] p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-[#2a2a2a] flex items-center justify-center text-white font-display text-sm">
                J
              </div>
              <span className="font-sans font-medium">@johndoe</span>
              <span className="text-[#888]">reblogged your post</span>
            </div>
            <p className="text-[#888] text-sm italic border-l-2 border-[#5B9A8B] pl-3">
              &quot;This is a preview of the reblogged post...&quot;
            </p>
          </div>
          <Button>View Reblog</Button>
          <Footer />
        </div>
      );

    case "message":
      return (
        <div className={baseStyles}>
          <Logo />
          <h2 className="font-display text-2xl text-center mb-4">You have a new message</h2>
          <p className="mb-4">Hey @username,</p>
          <div className="border border-[#2a2a2a] p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-[#2a2a2a] flex items-center justify-center text-white font-display text-sm">
                J
              </div>
              <span className="font-sans font-medium">@johndoe</span>
            </div>
            <p className="text-sm leading-relaxed">
              &quot;Hey! I saw your latest post and wanted to reach out...&quot;
            </p>
          </div>
          <Button>Read Message</Button>
          <Footer />
        </div>
      );

    case "mention":
      return (
        <div className={baseStyles}>
          <Logo />
          <h2 className="font-display text-2xl text-center mb-4">You were mentioned</h2>
          <p className="mb-4">Hey @username,</p>
          <div className="border border-[#2a2a2a] p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-[#2a2a2a] flex items-center justify-center text-white font-display text-sm">
                J
              </div>
              <span className="font-sans font-medium">@johndoe</span>
              <span className="text-[#888]">mentioned you</span>
            </div>
            <p className="text-sm leading-relaxed">
              &quot;Check out what <span className="text-[#5B9A8B]">@username</span> posted yesterday, it&apos;s incredible!&quot;
            </p>
          </div>
          <Button>View Post</Button>
          <Footer />
        </div>
      );

    case "digest":
      return (
        <div className={baseStyles}>
          <Logo />
          <h2 className="font-display text-2xl text-center mb-4">Your Daily Digest</h2>
          <p className="mb-4">Hey @username,</p>
          <p className="mb-4 leading-relaxed">Here&apos;s what you missed today:</p>

          <div className="space-y-3 mb-4">
            <div className="border border-[#2a2a2a] p-3 flex items-center gap-3">
              <span className="text-lg">❤️</span>
              <div>
                <p className="font-medium">3 new likes</p>
                <p className="text-[#888] text-xs">on your posts</p>
              </div>
            </div>
            <div className="border border-[#2a2a2a] p-3 flex items-center gap-3">
              <span className="text-lg">💬</span>
              <div>
                <p className="font-medium">2 new comments</p>
                <p className="text-[#888] text-xs">from @johndoe, @janedoe</p>
              </div>
            </div>
            <div className="border border-[#2a2a2a] p-3 flex items-center gap-3">
              <span className="text-lg">👥</span>
              <div>
                <p className="font-medium">1 new follower</p>
                <p className="text-[#888] text-xs">@newuser started following you</p>
              </div>
            </div>
          </div>

          <Button>View All Activity</Button>
          <Footer />
        </div>
      );

    case "announcement":
      return (
        <div className={baseStyles}>
          <Logo />
          <div className="text-center mb-4">
            <span className="inline-block text-[#5B9A8B] font-sans text-[11px] uppercase tracking-[0.2em]">
              ANNOUNCEMENT
            </span>
          </div>
          <h2 className="font-display text-2xl text-center mb-4">New Feature: Queue Scheduling!</h2>
          <p className="mb-4">Hey @username,</p>
          <p className="mb-4 leading-relaxed">
            We&apos;re excited to announce a new feature that lets you schedule your posts in advance!
          </p>
          <p className="mb-4 leading-relaxed">
            Now you can queue up content and set it to publish automatically at your preferred times.
          </p>
          <Button>Learn More</Button>
          <div className="border-t border-[#2a2a2a] pt-4 mt-6">
            <p className="text-[#888]">Thanks for being part of be.vocl!</p>
            <p className="text-[#888] italic mt-2">— The be.vocl Team</p>
          </div>
          <Footer />
        </div>
      );

    case "founder_message":
      return (
        <div className={baseStyles}>
          <Logo />
          <div className="text-center mb-4">
            <span className="inline-block text-[#F59E0B] font-sans text-[11px] uppercase tracking-[0.2em]">
              A MESSAGE FROM THE FOUNDER
            </span>
          </div>
          <h2 className="font-display text-2xl text-center mb-4">Thank You for Being Here</h2>
          <p className="mb-4">Hey @username,</p>
          <p className="mb-4 leading-relaxed">
            I wanted to take a moment to personally thank you for being part of be.vocl.
          </p>
          <p className="mb-4 leading-relaxed">
            Building this platform has been an incredible journey, and it wouldn&apos;t be possible without amazing people like you.
          </p>
          <div className="border-t border-[#2a2a2a] pt-4 mt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#2a2a2a] flex items-center justify-center text-white font-display text-lg">
                R
              </div>
              <div>
                <p className="font-sans font-medium">Richard</p>
                <p className="text-[#888] text-xs">Founder, be.vocl</p>
              </div>
            </div>
          </div>
          <Footer />
        </div>
      );

    default:
      return (
        <div className={baseStyles}>
          <p className="text-[#888] text-center">Template preview not available</p>
        </div>
      );
  }
}

// ============================================================================
// TAGS TAB
// ============================================================================

function TagsTab() {
  const [tags, setTags] = useState<UserTag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagDescription, setNewTagDescription] = useState("");
  const [newTagColor, setNewTagColor] = useState("#5B9A8B");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    setIsLoading(true);
    const result = await getUserTags();
    if (result.success && result.tags) {
      setTags(result.tags);
    }
    setIsLoading(false);
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      toast.error("Tag name is required");
      return;
    }

    setIsCreating(true);
    const result = await createUserTag(newTagName, newTagDescription, newTagColor);
    if (result.success) {
      toast.success("Tag created");
      setNewTagName("");
      setNewTagDescription("");
      setShowCreateForm(false);
      loadTags();
    } else {
      toast.error(result.error || "Failed to create tag");
    }
    setIsCreating(false);
  };

  const handleDeleteTag = async (tagId: string, tagName: string) => {
    if (!confirm(`Delete tag "${tagName}"? This will remove it from all users.`)) {
      return;
    }

    const result = await deleteUserTag(tagId);
    if (result.success) {
      toast.success("Tag deleted");
      loadTags();
    } else {
      toast.error(result.error || "Failed to delete tag");
    }
  };

  const colors = [
    "#5B9A8B", "#8B5CF6", "#F59E0B", "#EC4899", "#EF4444",
    "#10B981", "#3B82F6", "#6366F1", "#14B8A6", "#F97316",
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <IconLoader2 size={32} className="animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between border-b border-rule pb-3 mb-6">
        <h3 className="type-heading text-ink">User Tags</h3>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2 border border-foreground px-5 py-2.5 font-sans font-medium uppercase tracking-[0.16em] text-xs text-ink hover:bg-vocl-hover transition-colors"
        >
          {showCreateForm ? <IconX size={16} /> : <IconPlus size={16} />}
          {showCreateForm ? "Cancel" : "Create Tag"}
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="border border-rule p-4 mb-6 space-y-4">
          <div>
            <label className="slug text-meta-dim block mb-2">Tag Name</label>
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="e.g., beta-tester"
              className="w-full border border-rule bg-transparent px-4 py-2.5 font-serif text-[15px] text-ink placeholder:text-meta-dim focus:border-foreground focus:outline-none"
            />
          </div>
          <div>
            <label className="slug text-meta-dim block mb-2">Description (optional)</label>
            <input
              type="text"
              value={newTagDescription}
              onChange={(e) => setNewTagDescription(e.target.value)}
              placeholder="Brief description…"
              className="w-full border border-rule bg-transparent px-4 py-2.5 font-serif text-[15px] text-ink placeholder:text-meta-dim focus:border-foreground focus:outline-none"
            />
          </div>
          <div>
            <label className="slug text-meta-dim block mb-2">Color</label>
            <div className="flex gap-2.5 flex-wrap">
              {colors.map((color) => (
                <button
                  key={color}
                  onClick={() => setNewTagColor(color)}
                  className={`w-8 h-8 transition-shadow ${
                    newTagColor === color ? "ring-2 ring-accent" : ""
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          <button
            onClick={handleCreateTag}
            disabled={isCreating}
            className="w-full flex items-center justify-center gap-2 bg-accent px-6 py-3 font-sans font-medium uppercase tracking-[0.16em] text-xs text-white hover:opacity-[0.88] transition-opacity disabled:opacity-50"
          >
            {isCreating ? (
              <IconLoader2 size={16} className="animate-spin" />
            ) : (
              <IconCheck size={16} />
            )}
            Create Tag
          </button>
        </div>
      )}

      {/* Tags List */}
      <div>
        {tags.length === 0 ? (
          <p className="editorial-body text-meta text-center py-8">
            No tags created yet. Create one to start grouping users.
          </p>
        ) : (
          tags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center justify-between border-b border-rule py-3.5"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 flex-none"
                  style={{ backgroundColor: tag.color ?? undefined }}
                />
                <div>
                  <p className="font-sans text-sm font-medium text-ink">{tag.name}</p>
                  {tag.description && (
                    <p className="editorial-caption text-meta not-italic">{tag.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="byline text-meta">
                  {tag.userCount} users
                </span>
                <button
                  onClick={() => handleDeleteTag(tag.id, tag.name)}
                  className="p-2 text-meta hover:text-vocl-like transition-colors"
                >
                  <IconTrash size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================================
// HISTORY TAB
// ============================================================================

function HistoryTab() {
  const [history, setHistory] = useState<EmailSendRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setIsLoading(true);
    const result = await getEmailHistory();
    if (result.success && result.history) {
      setHistory(result.history);
    }
    setIsLoading(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <IconLoader2 size={32} className="animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div>
      <h3 className="type-heading text-ink border-b border-rule pb-3 mb-2">Email History</h3>

      {history.length === 0 ? (
        <p className="editorial-body text-meta text-center py-12">
          No emails sent yet
        </p>
      ) : (
        <div>
          {history.map((record) => (
            <div
              key={record.id}
              className="flex items-center justify-between border-b border-rule py-3.5"
            >
              <div className="flex-1 min-w-0">
                <p className="font-sans text-sm font-medium text-ink truncate">
                  {record.subject}
                </p>
                <p className="byline text-meta normal-case tracking-normal mt-0.5">
                  {record.templateType.replace("_", " ")} • {record.recipientCount} recipients
                  {record.sentBy && ` • sent by @${record.sentBy.username}`}
                </p>
              </div>
              <div className="text-right shrink-0 ml-4">
                <p className={`byline ${
                  record.status === "completed"
                    ? "text-accent"
                    : record.status === "failed"
                    ? "text-vocl-like"
                    : "text-meta"
                }`}>
                  {record.status}
                </p>
                <p className="slug text-meta-dim mt-1">
                  {formatDate(record.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
    <div className="py-6">
      <div className="flex items-center gap-3 mb-6">
        <IconMail size={28} className="text-vocl-accent" />
        <h1 className="text-2xl font-bold text-foreground">Email Management</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-white/10 pb-2 overflow-x-auto">
        {[
          { id: "compose" as Tab, label: "Compose", icon: IconSend },
          { id: "templates" as Tab, label: "Templates", icon: IconTemplate },
          { id: "tags" as Tab, label: "User Tags", icon: IconTag },
          { id: "history" as Tab, label: "History", icon: IconHistory },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors shrink-0 ${
              activeTab === tab.id
                ? "bg-vocl-accent text-white"
                : "text-foreground/70 hover:bg-white/5"
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "compose" && <ComposeTab />}
      {activeTab === "templates" && <TemplatesTab />}
      {activeTab === "tags" && <TagsTab />}
      {activeTab === "history" && <HistoryTab />}
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Compose Form */}
      <div className="space-y-6">
        {/* Template Type */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Template Type
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setTemplateType("announcement")}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                templateType === "announcement"
                  ? "bg-vocl-accent text-white"
                  : "bg-white/5 text-foreground/70 hover:bg-white/10"
              }`}
            >
              Announcement
            </button>
            <button
              onClick={() => setTemplateType("founder_message")}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                templateType === "founder_message"
                  ? "bg-vocl-accent text-white"
                  : "bg-white/5 text-foreground/70 hover:bg-white/10"
              }`}
            >
              Founder Message
            </button>
          </div>
        </div>

        {/* Recipients */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Recipients
          </label>
          <div className="space-y-3">
            <div className="flex gap-2">
              <button
                onClick={() => setRecipientType("all")}
                className={`py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  recipientType === "all"
                    ? "bg-vocl-accent text-white"
                    : "bg-white/5 text-foreground/70 hover:bg-white/10"
                }`}
              >
                All Users
              </button>
              <button
                onClick={() => setRecipientType("tags")}
                className={`py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  recipientType === "tags"
                    ? "bg-vocl-accent text-white"
                    : "bg-white/5 text-foreground/70 hover:bg-white/10"
                }`}
              >
                By Tag
              </button>
            </div>

            {recipientType === "tags" && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => {
                      setSelectedTags((prev) =>
                        prev.includes(tag.id)
                          ? prev.filter((id) => id !== tag.id)
                          : [...prev, tag.id]
                      );
                    }}
                    className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                      selectedTags.includes(tag.id)
                        ? "text-white"
                        : "bg-white/5 text-foreground/70 hover:bg-white/10"
                    }`}
                    style={{
                      backgroundColor: selectedTags.includes(tag.id)
                        ? tag.color
                        : undefined,
                    }}
                  >
                    {tag.name}
                    {tag.userCount !== undefined && (
                      <span className="ml-1 opacity-70">({tag.userCount})</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            <p className="text-sm text-foreground/50">
              {isLoadingRecipients ? (
                <IconLoader2 size={14} className="inline animate-spin mr-1" />
              ) : (
                <IconUsers size={14} className="inline mr-1" />
              )}
              {recipientCount !== null ? `${recipientCount} recipients` : "Loading..."}
            </p>
          </div>
        </div>

        {/* Subject */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Subject
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Enter email subject..."
            className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-vocl-accent"
          />
        </div>

        {/* Content */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Content
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your message here..."
            rows={8}
            className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-vocl-accent resize-none"
          />
          <p className="text-xs text-foreground/40 mt-1">
            Use line breaks to create paragraphs
          </p>
        </div>

        {/* CTA */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Button Text (optional)
            </label>
            <input
              type="text"
              value={ctaText}
              onChange={(e) => setCtaText(e.target.value)}
              placeholder="e.g., Learn More"
              className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-vocl-accent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Button URL (optional)
            </label>
            <input
              type="url"
              value={ctaUrl}
              onChange={(e) => setCtaUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-vocl-accent"
            />
          </div>
        </div>

        {/* Founder Message specific fields */}
        {templateType === "founder_message" && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Founder Name
                </label>
                <input
                  type="text"
                  value={founderName}
                  onChange={(e) => setFounderName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-vocl-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={founderTitle}
                  onChange={(e) => setFounderTitle(e.target.value)}
                  placeholder="e.g., Founder, be.vocl"
                  className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-vocl-accent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Custom Signature (optional)
              </label>
              <textarea
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                placeholder="e.g., Cheers,&#10;John"
                rows={2}
                className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-vocl-accent resize-none"
              />
            </div>
          </>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => setShowPreview(true)}
            className="flex-1 py-2.5 rounded-lg bg-white/5 text-foreground font-medium hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
          >
            <IconEye size={18} />
            Preview
          </button>
          <button
            onClick={handleSend}
            disabled={isSending || !subject || !content || recipientCount === 0}
            className="flex-1 py-2.5 rounded-lg bg-vocl-accent text-white font-medium hover:bg-vocl-accent-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSending ? (
              <IconLoader2 size={18} className="animate-spin" />
            ) : (
              <IconSend size={18} />
            )}
            Send Email
          </button>
        </div>
      </div>

      {/* Preview Panel */}
      <div className="bg-vocl-surface-dark rounded-xl p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <IconEye size={20} />
          Preview
        </h3>
        <div className="bg-[#1a1a1a] rounded-lg p-6 min-h-[400px]">
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
          className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
            templateType === "announcement"
              ? "bg-[#5B9A8B] text-white"
              : "bg-[#F59E0B] text-[#1a1a1a]"
          }`}
        >
          {templateType === "announcement" ? "ANNOUNCEMENT" : `A MESSAGE FROM ${(founderName || "THE FOUNDER").toUpperCase()}`}
        </span>
      </div>

      {/* Subject */}
      <h2 className="text-xl font-semibold text-center mb-4">
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
          <span className="inline-block bg-[#5B9A8B] text-white px-6 py-3 rounded-xl font-semibold">
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
            <div className="w-12 h-12 rounded-full bg-[#5B9A8B] flex items-center justify-center text-white font-bold text-lg">
              {(founderName || "F").charAt(0).toUpperCase()}
            </div>
            <div>
              {signature ? (
                <p className="italic whitespace-pre-line">{signature}</p>
              ) : (
                <>
                  <p className="font-semibold">{founderName || "Founder Name"}</p>
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
    { id: "reblog", name: "Post Reblogged", description: "Someone reblogged your post" },
    { id: "message", name: "New Message", description: "You received a message" },
    { id: "mention", name: "Mentioned", description: "Someone mentioned you" },
    { id: "digest", name: "Daily Digest", description: "Daily notification summary" },
    { id: "announcement", name: "Announcement", description: "Platform announcements" },
    { id: "founder_message", name: "Founder Message", description: "Personal message from founder" },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Template List */}
      <div className="lg:col-span-1 space-y-2">
        <h3 className="text-lg font-semibold text-foreground mb-4">Email Templates</h3>
        {templates.map((template) => (
          <button
            key={template.id}
            onClick={() => setSelectedTemplate(template.id)}
            className={`w-full text-left p-3 rounded-lg transition-colors ${
              selectedTemplate === template.id
                ? "bg-vocl-accent/20 border border-vocl-accent/40"
                : "bg-white/5 hover:bg-white/10"
            }`}
          >
            <p className="font-medium text-foreground">{template.name}</p>
            <p className="text-sm text-foreground/50">{template.description}</p>
          </button>
        ))}
      </div>

      {/* Template Preview */}
      <div className="lg:col-span-2">
        <div className="bg-vocl-surface-dark rounded-xl p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            {selectedTemplate ? "Template Preview" : "Select a template"}
          </h3>
          {selectedTemplate ? (
            <div className="bg-[#1a1a1a] rounded-lg p-6 min-h-[400px] overflow-auto">
              <TemplatePreview templateId={selectedTemplate} />
            </div>
          ) : (
            <p className="text-foreground/50 text-center py-20">
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
      <span className="inline-block bg-[#5B9A8B] text-white px-6 py-3 rounded-xl font-semibold">
        {children}
      </span>
    </div>
  );

  switch (templateId) {
    case "welcome":
      return (
        <div className={baseStyles}>
          <Logo />
          <h2 className="text-xl font-semibold text-center mb-4">Welcome to be.vocl! 🎉</h2>
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
          <h2 className="text-xl font-semibold text-center mb-4">Sign in to be.vocl</h2>
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
          <h2 className="text-xl font-semibold text-center mb-4">Reset Your Password</h2>
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
          <h2 className="text-xl font-semibold text-center mb-4">You have a new follower!</h2>
          <p className="mb-4">Hey @username,</p>
          <div className="flex items-center gap-3 bg-[#2a2a2a] p-4 rounded-xl mb-4">
            <div className="w-12 h-12 rounded-full bg-[#5B9A8B] flex items-center justify-center text-white font-bold">
              J
            </div>
            <div>
              <p className="font-semibold">@johndoe</p>
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
          <h2 className="text-xl font-semibold text-center mb-4">Someone liked your post! ❤️</h2>
          <p className="mb-4">Hey @username,</p>
          <div className="bg-[#2a2a2a] p-4 rounded-xl mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-[#5B9A8B] flex items-center justify-center text-white font-bold text-sm">
                J
              </div>
              <span className="font-semibold">@johndoe</span>
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
          <h2 className="text-xl font-semibold text-center mb-4">New comment on your post 💬</h2>
          <p className="mb-4">Hey @username,</p>
          <div className="bg-[#2a2a2a] p-4 rounded-xl mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-[#5B9A8B] flex items-center justify-center text-white font-bold text-sm">
                J
              </div>
              <span className="font-semibold">@johndoe</span>
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
          <h2 className="text-xl font-semibold text-center mb-4">Your post was reblogged! 🔄</h2>
          <p className="mb-4">Hey @username,</p>
          <div className="bg-[#2a2a2a] p-4 rounded-xl mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-[#5B9A8B] flex items-center justify-center text-white font-bold text-sm">
                J
              </div>
              <span className="font-semibold">@johndoe</span>
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
          <h2 className="text-xl font-semibold text-center mb-4">You have a new message! 💬</h2>
          <p className="mb-4">Hey @username,</p>
          <div className="bg-[#2a2a2a] p-4 rounded-xl mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-[#5B9A8B] flex items-center justify-center text-white font-bold text-sm">
                J
              </div>
              <span className="font-semibold">@johndoe</span>
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
          <h2 className="text-xl font-semibold text-center mb-4">You were mentioned! 👋</h2>
          <p className="mb-4">Hey @username,</p>
          <div className="bg-[#2a2a2a] p-4 rounded-xl mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-[#5B9A8B] flex items-center justify-center text-white font-bold text-sm">
                J
              </div>
              <span className="font-semibold">@johndoe</span>
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
          <h2 className="text-xl font-semibold text-center mb-4">Your Daily Digest 📬</h2>
          <p className="mb-4">Hey @username,</p>
          <p className="mb-4 leading-relaxed">Here&apos;s what you missed today:</p>

          <div className="space-y-3 mb-4">
            <div className="bg-[#2a2a2a] p-3 rounded-lg flex items-center gap-3">
              <span className="text-lg">❤️</span>
              <div>
                <p className="font-medium">3 new likes</p>
                <p className="text-[#888] text-xs">on your posts</p>
              </div>
            </div>
            <div className="bg-[#2a2a2a] p-3 rounded-lg flex items-center gap-3">
              <span className="text-lg">💬</span>
              <div>
                <p className="font-medium">2 new comments</p>
                <p className="text-[#888] text-xs">from @johndoe, @janedoe</p>
              </div>
            </div>
            <div className="bg-[#2a2a2a] p-3 rounded-lg flex items-center gap-3">
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
            <span className="inline-block bg-[#5B9A8B] text-white px-3 py-1 rounded-full text-xs font-bold">
              ANNOUNCEMENT
            </span>
          </div>
          <h2 className="text-xl font-semibold text-center mb-4">New Feature: Queue Scheduling!</h2>
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
            <span className="inline-block bg-[#F59E0B] text-[#1a1a1a] px-3 py-1 rounded-full text-xs font-bold">
              A MESSAGE FROM THE FOUNDER
            </span>
          </div>
          <h2 className="text-xl font-semibold text-center mb-4">Thank You for Being Here</h2>
          <p className="mb-4">Hey @username,</p>
          <p className="mb-4 leading-relaxed">
            I wanted to take a moment to personally thank you for being part of be.vocl.
          </p>
          <p className="mb-4 leading-relaxed">
            Building this platform has been an incredible journey, and it wouldn&apos;t be possible without amazing people like you.
          </p>
          <div className="border-t border-[#2a2a2a] pt-4 mt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#5B9A8B] flex items-center justify-center text-white font-bold text-lg">
                R
              </div>
              <div>
                <p className="font-semibold">Richard</p>
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
        <IconLoader2 size={32} className="animate-spin text-vocl-accent" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">User Tags</h3>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-vocl-accent text-white font-medium hover:bg-vocl-accent-hover transition-colors"
        >
          {showCreateForm ? <IconX size={18} /> : <IconPlus size={18} />}
          {showCreateForm ? "Cancel" : "Create Tag"}
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-vocl-surface-dark rounded-xl p-4 mb-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Tag Name
            </label>
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="e.g., beta-tester"
              className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-vocl-accent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Description (optional)
            </label>
            <input
              type="text"
              value={newTagDescription}
              onChange={(e) => setNewTagDescription(e.target.value)}
              placeholder="Brief description..."
              className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-vocl-accent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Color
            </label>
            <div className="flex gap-2 flex-wrap">
              {colors.map((color) => (
                <button
                  key={color}
                  onClick={() => setNewTagColor(color)}
                  className={`w-8 h-8 rounded-full transition-transform ${
                    newTagColor === color ? "ring-2 ring-white scale-110" : ""
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          <button
            onClick={handleCreateTag}
            disabled={isCreating}
            className="w-full py-2.5 rounded-lg bg-vocl-accent text-white font-medium hover:bg-vocl-accent-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isCreating ? (
              <IconLoader2 size={18} className="animate-spin" />
            ) : (
              <IconCheck size={18} />
            )}
            Create Tag
          </button>
        </div>
      )}

      {/* Tags List */}
      <div className="space-y-2">
        {tags.length === 0 ? (
          <p className="text-foreground/50 text-center py-8">
            No tags created yet. Create one to start grouping users.
          </p>
        ) : (
          tags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center justify-between p-4 rounded-xl bg-white/5"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
                <div>
                  <p className="font-medium text-foreground">{tag.name}</p>
                  {tag.description && (
                    <p className="text-sm text-foreground/50">{tag.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-foreground/50">
                  {tag.userCount} users
                </span>
                <button
                  onClick={() => handleDeleteTag(tag.id, tag.name)}
                  className="p-2 rounded-lg text-foreground/50 hover:text-red-400 hover:bg-red-400/10 transition-colors"
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
        <IconLoader2 size={32} className="animate-spin text-vocl-accent" />
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-foreground mb-6">Email History</h3>

      {history.length === 0 ? (
        <p className="text-foreground/50 text-center py-12">
          No emails sent yet
        </p>
      ) : (
        <div className="space-y-2">
          {history.map((record) => (
            <div
              key={record.id}
              className="flex items-center justify-between p-4 rounded-xl bg-white/5"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">
                  {record.subject}
                </p>
                <p className="text-sm text-foreground/50">
                  {record.templateType.replace("_", " ")} • {record.recipientCount} recipients
                  {record.sentBy && ` • sent by @${record.sentBy.username}`}
                </p>
              </div>
              <div className="text-right shrink-0 ml-4">
                <p className={`text-sm font-medium ${
                  record.status === "completed"
                    ? "text-green-400"
                    : record.status === "failed"
                    ? "text-red-400"
                    : "text-yellow-400"
                }`}>
                  {record.status}
                </p>
                <p className="text-xs text-foreground/40">
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

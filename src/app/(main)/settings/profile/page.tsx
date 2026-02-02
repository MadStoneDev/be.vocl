"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  IconArrowLeft,
  IconCamera,
  IconLoader2,
  IconPlus,
  IconTrash,
  IconGripVertical,
  IconCheck,
} from "@tabler/icons-react";
import Link from "next/link";
import { toast } from "@/components/ui";
import {
  getCurrentProfile,
  updateProfile,
  getProfileLinks,
  addProfileLink,
  removeProfileLink,
} from "@/actions/profile";

interface ProfileLink {
  id: string;
  title: string;
  url: string;
}

export default function ProfileSettingsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Profile data
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [headerUrl, setHeaderUrl] = useState<string | null>(null);
  const [links, setLinks] = useState<ProfileLink[]>([]);

  // New link form
  const [newLinkTitle, setNewLinkTitle] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [isAddingLink, setIsAddingLink] = useState(false);

  // File inputs
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const headerInputRef = useRef<HTMLInputElement>(null);

  // Track changes
  const [hasChanges, setHasChanges] = useState(false);
  const [originalData, setOriginalData] = useState({
    displayName: "",
    bio: "",
  });

  useEffect(() => {
    const fetchProfile = async () => {
      const result = await getCurrentProfile();
      if (result.success && result.profile) {
        setDisplayName(result.profile.displayName || "");
        setUsername(result.profile.username);
        setBio(result.profile.bio || "");
        setAvatarUrl(result.profile.avatarUrl || null);
        setHeaderUrl(result.profile.headerUrl || null);
        setOriginalData({
          displayName: result.profile.displayName || "",
          bio: result.profile.bio || "",
        });

        // Fetch links
        const linksResult = await getProfileLinks(result.profile.id);
        if (linksResult.success && linksResult.links) {
          setLinks(linksResult.links);
        }
      }
      setIsLoading(false);
    };
    fetchProfile();
  }, []);

  // Check for changes
  useEffect(() => {
    const changed =
      displayName !== originalData.displayName || bio !== originalData.bio;
    setHasChanges(changed);
  }, [displayName, bio, originalData]);

  const handleSave = async () => {
    setIsSaving(true);
    const result = await updateProfile({
      displayName: displayName || undefined,
      bio: bio || undefined,
    });

    if (result.success) {
      toast.success("Profile updated!");
      setOriginalData({ displayName, bio });
      setHasChanges(false);
    } else {
      toast.error(result.error || "Failed to update profile");
    }
    setIsSaving(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    try {
      // Get presigned URL
      const presignRes = await fetch("/api/upload/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          uploadType: "avatar",
        }),
      });

      if (!presignRes.ok) throw new Error("Failed to get upload URL");

      const { uploadUrl, publicUrl } = await presignRes.json();

      // Upload file
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      if (!uploadRes.ok) throw new Error("Failed to upload file");

      // Update profile
      const updateResult = await updateProfile({ avatarUrl: publicUrl });
      if (updateResult.success) {
        setAvatarUrl(publicUrl);
        toast.success("Avatar updated!");
      } else {
        throw new Error(updateResult.error);
      }
    } catch (error) {
      toast.error("Failed to upload avatar");
    }
  };

  const handleHeaderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be less than 10MB");
      return;
    }

    try {
      const presignRes = await fetch("/api/upload/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          uploadType: "header",
        }),
      });

      if (!presignRes.ok) throw new Error("Failed to get upload URL");

      const { uploadUrl, publicUrl } = await presignRes.json();

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      if (!uploadRes.ok) throw new Error("Failed to upload file");

      const updateResult = await updateProfile({ headerUrl: publicUrl });
      if (updateResult.success) {
        setHeaderUrl(publicUrl);
        toast.success("Header updated!");
      } else {
        throw new Error(updateResult.error);
      }
    } catch (error) {
      toast.error("Failed to upload header image");
    }
  };

  const handleAddLink = async () => {
    if (!newLinkTitle.trim() || !newLinkUrl.trim()) {
      toast.error("Please fill in both title and URL");
      return;
    }

    // Validate URL
    try {
      new URL(newLinkUrl);
    } catch {
      toast.error("Please enter a valid URL");
      return;
    }

    setIsAddingLink(true);
    const result = await addProfileLink(newLinkTitle.trim(), newLinkUrl.trim());

    if (result.success && result.linkId) {
      setLinks([...links, { id: result.linkId, title: newLinkTitle.trim(), url: newLinkUrl.trim() }]);
      setNewLinkTitle("");
      setNewLinkUrl("");
      toast.success("Link added!");
    } else {
      toast.error(result.error || "Failed to add link");
    }
    setIsAddingLink(false);
  };

  const handleRemoveLink = async (linkId: string) => {
    const result = await removeProfileLink(linkId);
    if (result.success) {
      setLinks(links.filter((l) => l.id !== linkId));
      toast.success("Link removed");
    } else {
      toast.error("Failed to remove link");
    }
  };

  if (isLoading) {
    return (
      <div className="py-6 flex justify-center">
        <IconLoader2 size={32} className="animate-spin text-vocl-accent" />
      </div>
    );
  }

  return (
    <div className="py-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/settings"
          className="p-2 -ml-2 rounded-xl hover:bg-white/5 transition-colors"
        >
          <IconArrowLeft size={24} className="text-foreground/70" />
        </Link>
        <h1 className="text-2xl font-bold text-foreground">Edit Profile</h1>
      </div>

      {/* Header Image */}
      <div className="relative mb-16">
        <div className="relative h-32 sm:h-40 w-full rounded-xl overflow-hidden">
          {headerUrl ? (
            <Image
              src={headerUrl}
              alt="Header"
              fill
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-vocl-accent/30 via-vocl-accent/10 to-background" />
          )}
          <button
            onClick={() => headerInputRef.current?.click()}
            className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity"
          >
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 backdrop-blur text-white">
              <IconCamera size={20} />
              <span className="text-sm font-medium">Change header</span>
            </div>
          </button>
        </div>
        <input
          ref={headerInputRef}
          type="file"
          accept="image/*"
          onChange={handleHeaderUpload}
          className="hidden"
        />

        {/* Avatar */}
        <div className="absolute -bottom-12 left-4">
          <div className="relative">
            <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-background shadow-xl">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={username}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-vocl-accent to-vocl-accent-hover flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">
                    {username.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={() => avatarInputRef.current?.click()}
              className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 hover:opacity-100 transition-opacity"
            >
              <IconCamera size={24} className="text-white" />
            </button>
          </div>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            className="hidden"
          />
        </div>
      </div>

      {/* Form */}
      <div className="space-y-6">
        {/* Display Name */}
        <div>
          <label className="block text-sm font-medium text-foreground/70 mb-2">
            Display Name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={username}
            maxLength={50}
            className="w-full px-4 py-3 rounded-xl bg-vocl-surface-dark border border-white/10 text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-vocl-accent focus:border-transparent"
          />
          <p className="mt-1 text-xs text-foreground/50">
            {displayName.length}/50 characters
          </p>
        </div>

        {/* Username (read-only) */}
        <div>
          <label className="block text-sm font-medium text-foreground/70 mb-2">
            Username
          </label>
          <div className="w-full px-4 py-3 rounded-xl bg-vocl-surface-dark/50 border border-white/5 text-foreground/50">
            @{username}
          </div>
          <p className="mt-1 text-xs text-foreground/50">
            Username cannot be changed
          </p>
        </div>

        {/* Bio */}
        <div>
          <label className="block text-sm font-medium text-foreground/70 mb-2">
            Bio
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell the world about yourself..."
            maxLength={160}
            rows={3}
            className="w-full px-4 py-3 rounded-xl bg-vocl-surface-dark border border-white/10 text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-vocl-accent focus:border-transparent resize-none"
          />
          <p className="mt-1 text-xs text-foreground/50">
            {bio.length}/160 characters
          </p>
        </div>

        {/* Save Button */}
        {hasChanges && (
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-3 rounded-xl bg-vocl-accent text-white font-semibold hover:bg-vocl-accent-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <IconLoader2 size={20} className="animate-spin" />
            ) : (
              <IconCheck size={20} />
            )}
            Save Changes
          </button>
        )}

        {/* Divider */}
        <div className="border-t border-white/10 pt-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Profile Links
          </h2>
          <p className="text-sm text-foreground/50 mb-4">
            Add links to your website, social media, or other profiles
          </p>

          {/* Existing Links */}
          {links.length > 0 && (
            <div className="space-y-2 mb-4">
              {links.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-vocl-surface-dark"
                >
                  <IconGripVertical
                    size={18}
                    className="text-foreground/30 cursor-grab"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {link.title}
                    </p>
                    <p className="text-xs text-foreground/50 truncate">
                      {link.url}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemoveLink(link.id)}
                    className="p-2 rounded-lg text-foreground/50 hover:text-vocl-like hover:bg-vocl-like/10 transition-colors"
                  >
                    <IconTrash size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add New Link */}
          <div className="space-y-3 p-4 rounded-xl bg-vocl-surface-dark/50 border border-white/5">
            <input
              type="text"
              value={newLinkTitle}
              onChange={(e) => setNewLinkTitle(e.target.value)}
              placeholder="Link title (e.g., My Website)"
              maxLength={30}
              className="w-full px-4 py-2.5 rounded-lg bg-vocl-surface-dark border border-white/10 text-foreground text-sm placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-vocl-accent focus:border-transparent"
            />
            <input
              type="url"
              value={newLinkUrl}
              onChange={(e) => setNewLinkUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-4 py-2.5 rounded-lg bg-vocl-surface-dark border border-white/10 text-foreground text-sm placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-vocl-accent focus:border-transparent"
            />
            <button
              onClick={handleAddLink}
              disabled={isAddingLink || !newLinkTitle.trim() || !newLinkUrl.trim()}
              className="w-full py-2.5 rounded-lg bg-white/10 text-foreground font-medium hover:bg-white/15 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isAddingLink ? (
                <IconLoader2 size={18} className="animate-spin" />
              ) : (
                <IconPlus size={18} />
              )}
              Add Link
            </button>
          </div>

          {links.length >= 5 && (
            <p className="mt-2 text-xs text-foreground/50">
              Maximum 5 links allowed
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

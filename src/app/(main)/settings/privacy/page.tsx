"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  IconArrowLeft,
  IconEye,
  IconEyeOff,
  IconLoader2,
  IconUserX,
  IconVolume3,
  IconHash,
  IconTrash,
  IconAlertCircle,
  IconMessageQuestion,
  IconWorld,
  IconSearch,
} from "@tabler/icons-react";
import { toast } from "@/components/ui";
import {
  getCurrentProfile,
  updatePrivacySettings,
  updateContentSettings,
  updateWebVisibilitySettings,
} from "@/actions/profile";
import { unblockUser, unmuteUser, getBlockedUsers, getMutedUsers } from "@/actions/follows";
import { updateAskSettings } from "@/actions/asks";
import { getMutedTags, unmuteTag } from "@/actions/tags";

interface BlockedUser {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

interface MutedUser {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

interface MutedTag {
  id: string;
  name: string;
  postCount: number;
}

export default function PrivacySettingsPage() {
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);

  // Privacy settings
  const [showLikes, setShowLikes] = useState(true);
  const [showComments, setShowComments] = useState(true);
  const [showFollowers, setShowFollowers] = useState(true);
  const [showFollowing, setShowFollowing] = useState(true);

  // Public web settings
  const [isDiscoverable, setIsDiscoverable] = useState(true);
  const [allowSearchIndexing, setAllowSearchIndexing] = useState(true);
  const [isSearchable, setIsSearchable] = useState(true);

  // Content settings
  const [showSensitivePosts, setShowSensitivePosts] = useState(false);
  const [blurSensitiveByDefault, setBlurSensitiveByDefault] = useState(true);

  // Ask settings
  const [allowAsks, setAllowAsks] = useState(true);
  const [allowAnonymousAsks, setAllowAnonymousAsks] = useState(true);

  // Blocked and muted lists
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [mutedUsers, setMutedUsers] = useState<MutedUser[]>([]);
  const [mutedTags, setMutedTags] = useState<MutedTag[]>([]);
  const [activeTab, setActiveTab] = useState<"privacy" | "content" | "asks" | "blocked" | "muted" | "muted_tags">("privacy");

  useEffect(() => {
    async function loadSettings() {
      const [profileResult, mutedTagsResult, blockedResult, mutedUsersResult] =
        await Promise.all([
          getCurrentProfile(),
          getMutedTags(),
          getBlockedUsers(),
          getMutedUsers(),
        ]);
      if (profileResult.success && profileResult.profile) {
        setShowLikes(profileResult.profile.showLikes);
        setShowComments(profileResult.profile.showComments);
        setShowFollowers(profileResult.profile.showFollowers);
        setShowFollowing(profileResult.profile.showFollowing);
        setIsDiscoverable(profileResult.profile.isDiscoverable ?? true);
        setAllowSearchIndexing(profileResult.profile.allowSearchIndexing ?? true);
        setIsSearchable(profileResult.profile.isSearchable ?? true);
        setShowSensitivePosts(profileResult.profile.showSensitivePosts);
        setBlurSensitiveByDefault(profileResult.profile.blurSensitiveByDefault);
        setAllowAsks(profileResult.profile.allowAsks ?? true);
        setAllowAnonymousAsks(profileResult.profile.allowAnonymousAsks ?? true);
      }
      if (mutedTagsResult.success && mutedTagsResult.tags) {
        setMutedTags(mutedTagsResult.tags);
      }
      if (blockedResult.success && blockedResult.users) {
        setBlockedUsers(blockedResult.users);
      }
      if (mutedUsersResult.success && mutedUsersResult.users) {
        setMutedUsers(mutedUsersResult.users);
      }
      setIsLoading(false);
    }
    loadSettings();
  }, []);

  const handlePrivacyChange = useCallback((key: string, value: boolean) => {
    startTransition(async () => {
      const result = await updatePrivacySettings({ [key]: value });
      if (result.success) {
        toast.success("Privacy settings updated");
      } else {
        toast.error(result.error || "Failed to update settings");
      }
    });
  }, []);

  const handleWebVisibilityChange = useCallback(
    (key: "isDiscoverable" | "allowSearchIndexing" | "isSearchable", value: boolean) => {
      startTransition(async () => {
        const result = await updateWebVisibilitySettings({ [key]: value });
        if (result.success) {
          toast.success("Web settings updated");
        } else {
          toast.error(result.error || "Failed to update settings");
        }
      });
    },
    []
  );

  const handleContentChange = useCallback((key: string, value: boolean) => {
    startTransition(async () => {
      const settings: any = {};
      if (key === "showSensitivePosts") settings.showSensitivePosts = value;
      if (key === "blurSensitiveByDefault") settings.blurSensitiveByDefault = value;

      const result = await updateContentSettings(settings);
      if (result.success) {
        toast.success("Content settings updated");
      } else {
        toast.error(result.error || "Failed to update settings");
      }
    });
  }, []);

  const handleAskSettingsChange = useCallback(
    (newAllowAsks: boolean, newAllowAnonymous: boolean) => {
      startTransition(async () => {
        const result = await updateAskSettings(newAllowAsks, newAllowAnonymous);
        if (result.success) {
          toast.success("Ask settings updated");
        } else {
          toast.error(result.error || "Failed to update settings");
        }
      });
    },
    []
  );

  const handleUnblock = useCallback(async (userId: string) => {
    const result = await unblockUser(userId);
    if (result.success) {
      setBlockedUsers((prev) => prev.filter((u) => u.id !== userId));
      toast.success("User unblocked");
    } else {
      toast.error(result.error || "Failed to unblock user");
    }
  }, []);

  const handleUnmute = useCallback(async (userId: string) => {
    const result = await unmuteUser(userId);
    if (result.success) {
      setMutedUsers((prev) => prev.filter((u) => u.id !== userId));
      toast.success("User unmuted");
    } else {
      toast.error(result.error || "Failed to unmute user");
    }
  }, []);

  const handleUnmuteTag = useCallback(async (tagId: string) => {
    const result = await unmuteTag(tagId);
    if (result.success) {
      setMutedTags((prev) => prev.filter((t) => t.id !== tagId));
      toast.success("Tag unmuted");
    } else {
      toast.error(result.error || "Failed to unmute tag");
    }
  }, []);

  if (isLoading) {
    return (
      <div className="py-6 flex justify-center">
        <IconLoader2 size={32} className="animate-spin text-vocl-primary" />
      </div>
    );
  }

  return (
    <div className="py-6 max-w-2xl mx-auto">
      <title>Settings — Privacy | be.vocl</title>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 border-b border-vocl-border pb-5">
        <Link
          href="/settings"
          className="w-10 h-10 rounded-full bg-vocl-hover flex items-center justify-center hover:bg-vocl-hover-strong transition-colors shrink-0"
        >
          <IconArrowLeft size={20} className="text-foreground" />
        </Link>
        <div>
          <span className="type-meta uppercase tracking-widest text-vocl-primary font-semibold">
            Settings
          </span>
          <h1 className="type-display font-display text-foreground">Privacy &amp; Content</h1>
          <p className="type-body text-foreground/55 mt-1">Control your privacy and content preferences</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { id: "privacy" as const, label: "Privacy" },
          { id: "content" as const, label: "Content" },
          { id: "asks" as const, label: "Asks" },
          { id: "blocked" as const, label: "Blocked" },
          { id: "muted" as const, label: "Muted" },
          { id: "muted_tags" as const, label: "Muted Tags" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-sm text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? "bg-vocl-primary text-white"
                : "bg-vocl-hover text-foreground/60 hover:bg-vocl-hover-strong"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Privacy Tab */}
      {activeTab === "privacy" && (
        <div className="space-y-4">
          <div className="p-4 rounded-sm bg-vocl-surface-dark border border-vocl-border">
            <h3 className="type-heading font-display text-foreground mb-4 flex items-center gap-2">
              <IconEye size={20} />
              Profile Visibility
            </h3>
            <div className="space-y-4">
              <ToggleSetting
                label="Show likes on profile"
                description="Let others see the posts you've liked"
                checked={showLikes}
                onChange={(checked) => {
                  setShowLikes(checked);
                  handlePrivacyChange("showLikes", checked);
                }}
                disabled={isPending}
              />
              <ToggleSetting
                label="Show comments on profile"
                description="Let others see your comments"
                checked={showComments}
                onChange={(checked) => {
                  setShowComments(checked);
                  handlePrivacyChange("showComments", checked);
                }}
                disabled={isPending}
              />
              <ToggleSetting
                label="Show followers count"
                description="Display your follower count on your profile"
                checked={showFollowers}
                onChange={(checked) => {
                  setShowFollowers(checked);
                  handlePrivacyChange("showFollowers", checked);
                }}
                disabled={isPending}
              />
              <ToggleSetting
                label="Show following count"
                description="Display how many people you follow"
                checked={showFollowing}
                onChange={(checked) => {
                  setShowFollowing(checked);
                  handlePrivacyChange("showFollowing", checked);
                }}
                disabled={isPending}
              />
            </div>
          </div>

          <div className="p-4 rounded-sm bg-vocl-surface-dark border border-vocl-border">
            <h3 className="type-heading font-display text-foreground mb-1 flex items-center gap-2">
              <IconSearch size={20} />
              Finding you on be.vocl
            </h3>
            <p className="text-xs text-foreground/50 mb-4">
              Controls whether other members can find your account through the in-app
              search box.
            </p>
            <div className="space-y-4">
              <ToggleSetting
                label="Let other members find me in search"
                description="Show my account in be.vocl's people search results. Turning this off doesn't affect people who already follow you or have your link."
                checked={isSearchable}
                onChange={(checked) => {
                  setIsSearchable(checked);
                  handleWebVisibilityChange("isSearchable", checked);
                }}
                disabled={isPending}
              />
            </div>
          </div>

          <div className="p-4 rounded-sm bg-vocl-surface-dark border border-vocl-border">
            <h3 className="type-heading font-display text-foreground mb-1 flex items-center gap-2">
              <IconWorld size={20} />
              Public web
            </h3>
            <p className="text-xs text-foreground/50 mb-4">
              Your profile and feed are only visible to logged-in be.vocl members.
              Only posts you set to{" "}
              <span className="font-medium text-foreground/70">Public</span> can be
              seen by logged-out visitors. These settings control where those public
              posts can appear.
            </p>
            <div className="space-y-4">
              <ToggleSetting
                label="Feature my public posts on be.vocl"
                description="Let your Public posts appear on the be.vocl front page and the public Discover page for logged-out visitors."
                checked={isDiscoverable}
                onChange={(checked) => {
                  setIsDiscoverable(checked);
                  handleWebVisibilityChange("isDiscoverable", checked);
                }}
                disabled={isPending}
              />
              <ToggleSetting
                label="Allow search engines to index my public posts"
                description="Let search engines like Google index the Public posts you share. Your profile and Members-only posts are never indexed."
                checked={allowSearchIndexing}
                onChange={(checked) => {
                  setAllowSearchIndexing(checked);
                  handleWebVisibilityChange("allowSearchIndexing", checked);
                }}
                disabled={isPending}
              />
            </div>
          </div>
        </div>
      )}

      {/* Content Tab */}
      {activeTab === "content" && (
        <div className="space-y-4">
          <div className="p-4 rounded-sm bg-vocl-surface-dark border border-vocl-border">
            <h3 className="type-heading font-display text-foreground mb-4 flex items-center gap-2">
              <IconEyeOff size={20} />
              Sensitive Content
            </h3>
            <div className="space-y-4">
              <ToggleSetting
                label="Show sensitive content"
                description="Display posts marked as sensitive in your feed"
                checked={showSensitivePosts}
                onChange={(checked) => {
                  setShowSensitivePosts(checked);
                  handleContentChange("showSensitivePosts", checked);
                }}
                disabled={isPending}
              />
              <ToggleSetting
                label="Blur sensitive content by default"
                description="Require a click to reveal sensitive posts"
                checked={blurSensitiveByDefault}
                onChange={(checked) => {
                  setBlurSensitiveByDefault(checked);
                  handleContentChange("blurSensitiveByDefault", checked);
                }}
                disabled={isPending || !showSensitivePosts}
              />
            </div>
          </div>

          <div className="p-4 rounded-sm bg-amber-500/10 border border-amber-500/20">
            <div className="flex gap-3">
              <IconAlertCircle size={20} className="text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-foreground">
                  Sensitive content includes posts that have been marked by their creators
                  as containing mature themes, violence, or other content that may not be
                  suitable for all audiences.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Asks Tab */}
      {activeTab === "asks" && (
        <div className="space-y-4">
          <div className="p-4 rounded-sm bg-vocl-surface-dark border border-vocl-border">
            <h3 className="type-heading font-display text-foreground mb-4 flex items-center gap-2">
              <IconMessageQuestion size={20} />
              Ask Box Settings
            </h3>
            <div className="space-y-4">
              <ToggleSetting
                label="Allow asks"
                description="Let other users send you questions"
                checked={allowAsks}
                onChange={(checked) => {
                  setAllowAsks(checked);
                  handleAskSettingsChange(checked, allowAnonymousAsks);
                }}
                disabled={isPending}
              />
              <ToggleSetting
                label="Allow anonymous asks"
                description="Let users send questions without revealing their identity"
                checked={allowAnonymousAsks}
                onChange={(checked) => {
                  setAllowAnonymousAsks(checked);
                  handleAskSettingsChange(allowAsks, checked);
                }}
                disabled={isPending || !allowAsks}
              />
            </div>
          </div>
          <p className="text-xs text-foreground/40 px-2">
            When asks are enabled, an &quot;Ask&quot; button will appear on your profile.
            Others can send you questions that you can answer publicly.
          </p>
        </div>
      )}

      {/* Blocked Tab */}
      {activeTab === "blocked" && (
        <div className="space-y-4">
          <div className="p-4 rounded-sm bg-vocl-surface-dark border border-vocl-border">
            <h3 className="type-heading font-display text-foreground mb-4 flex items-center gap-2">
              <IconUserX size={20} />
              Blocked Users
            </h3>
            {blockedUsers.length === 0 ? (
              <p className="text-foreground/50 text-sm text-center py-8">
                You haven&apos;t blocked anyone yet
              </p>
            ) : (
              <div className="space-y-2">
                {blockedUsers.map((user) => (
                  <UserListItem
                    key={user.id}
                    user={user}
                    action="Unblock"
                    onAction={() => handleUnblock(user.id)}
                  />
                ))}
              </div>
            )}
          </div>
          <p className="text-xs text-foreground/40 px-2">
            Blocked users cannot see your profile, posts, or send you messages.
            You won&apos;t see their content in your feed.
          </p>
        </div>
      )}

      {/* Muted Tab */}
      {activeTab === "muted" && (
        <div className="space-y-4">
          <div className="p-4 rounded-sm bg-vocl-surface-dark border border-vocl-border">
            <h3 className="type-heading font-display text-foreground mb-4 flex items-center gap-2">
              <IconVolume3 size={20} />
              Muted Users
            </h3>
            {mutedUsers.length === 0 ? (
              <p className="text-foreground/50 text-sm text-center py-8">
                You haven&apos;t muted anyone yet
              </p>
            ) : (
              <div className="space-y-2">
                {mutedUsers.map((user) => (
                  <UserListItem
                    key={user.id}
                    user={user}
                    action="Unmute"
                    onAction={() => handleUnmute(user.id)}
                  />
                ))}
              </div>
            )}
          </div>
          <p className="text-xs text-foreground/40 px-2">
            Muted users&apos; posts won&apos;t appear in your feed, but they can
            still follow you and see your content.
          </p>
        </div>
      )}

      {/* Muted Tags Tab */}
      {activeTab === "muted_tags" && (
        <div className="space-y-4">
          <div className="p-4 rounded-sm bg-vocl-surface-dark border border-vocl-border">
            <h3 className="type-heading font-display text-foreground mb-4 flex items-center gap-2">
              <IconHash size={20} />
              Muted Tags
            </h3>
            {mutedTags.length === 0 ? (
              <p className="text-foreground/50 text-sm text-center py-8">
                You haven&apos;t muted any tags yet
              </p>
            ) : (
              <div className="space-y-2">
                {mutedTags.map((tag) => (
                  <div key={tag.id} className="flex items-center gap-3 p-3 rounded-sm bg-vocl-hover">
                    <div className="w-10 h-10 rounded-full bg-vocl-primary/20 flex items-center justify-center">
                      <IconHash size={18} className="text-vocl-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">
                        #{tag.name}
                      </p>
                      <p className="text-xs text-foreground/50">
                        {tag.postCount.toLocaleString()} {tag.postCount === 1 ? "post" : "posts"}
                      </p>
                    </div>
                    <button
                      onClick={() => handleUnmuteTag(tag.id)}
                      className="px-3 py-1.5 rounded-lg bg-vocl-hover-strong text-foreground/70 text-sm hover:bg-vocl-hover-strong hover:text-foreground transition-colors"
                    >
                      Unmute
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <p className="text-xs text-foreground/40 px-2">
            Posts with muted tags won&apos;t appear in your feed. You can mute
            tags from tag pages or the post menu.
          </p>
        </div>
      )}
    </div>
  );
}

// Toggle setting component
function ToggleSetting({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-foreground/50">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        disabled={disabled}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          checked ? "bg-vocl-primary" : "bg-vocl-hover-strong"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

// User list item component
function UserListItem({
  user,
  action,
  onAction,
}: {
  user: BlockedUser | MutedUser;
  action: string;
  onAction: () => void;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-sm bg-vocl-hover">
      <div className="relative w-10 h-10 rounded-full overflow-hidden">
        {user.avatarUrl ? (
          <Image
            src={user.avatarUrl}
            alt={user.username}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-vocl-primary to-vocl-primary-hover flex items-center justify-center">
            <span className="text-sm font-bold text-white">
              {user.username.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground text-sm truncate">
          {user.displayName || user.username}
        </p>
        <p className="text-xs text-foreground/50 truncate">@{user.username}</p>
      </div>
      <button
        onClick={onAction}
        className="px-3 py-1.5 rounded-lg bg-vocl-hover-strong text-foreground/70 text-sm hover:bg-vocl-hover-strong hover:text-foreground transition-colors"
      >
        {action}
      </button>
    </div>
  );
}

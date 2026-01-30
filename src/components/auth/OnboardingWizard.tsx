"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import {
  IconArrowRight,
  IconArrowLeft,
  IconCheck,
  IconUpload,
  IconUser,
  IconSparkles,
  IconEye,
  IconEyeOff,
  IconLoader2,
  IconX,
} from "@tabler/icons-react";
import { completeOnboarding } from "@/actions/profile";
import { followUser } from "@/actions/follows";
import { getSuggestedUsers } from "@/actions/search";
import { toast } from "@/components/ui";

interface OnboardingWizardProps {
  username: string;
  onComplete: () => void;
}

interface SuggestedUser {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  followerCount: number;
}

const STEPS = [
  { id: "welcome", title: "Welcome" },
  { id: "profile", title: "Your Profile" },
  { id: "avatar", title: "Add a Photo" },
  { id: "content", title: "Content Preferences" },
  { id: "follow", title: "Find People" },
];

export function OnboardingWizard({ username, onComplete }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showSensitivePosts, setShowSensitivePosts] = useState(false);
  const [blurSensitiveByDefault, setBlurSensitiveByDefault] = useState(true);

  // Suggested users state
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const loadSuggestedUsers = useCallback(async () => {
    setLoadingSuggestions(true);
    const result = await getSuggestedUsers(8);
    if (result.success && result.users) {
      setSuggestedUsers(result.users);
    }
    setLoadingSuggestions(false);
  }, []);

  const handleAvatarSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setAvatarFile(file);
    // Create preview URL
    setAvatarUrl(URL.createObjectURL(file));
  }, []);

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile) return avatarUrl;

    setIsUploadingAvatar(true);
    try {
      // Get presigned URL
      const presignRes = await fetch("/api/upload/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: avatarFile.name,
          contentType: avatarFile.type,
          folder: "avatars",
        }),
      });

      if (!presignRes.ok) throw new Error("Failed to get upload URL");

      const { uploadUrl, publicUrl } = await presignRes.json();

      // Upload to R2
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: avatarFile,
        headers: { "Content-Type": avatarFile.type },
      });

      if (!uploadRes.ok) throw new Error("Failed to upload image");

      return publicUrl;
    } catch (error) {
      console.error("Avatar upload error:", error);
      toast.error("Failed to upload avatar");
      return null;
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleFollow = async (userId: string) => {
    const result = await followUser(userId);
    if (result.success) {
      setFollowedUsers((prev) => new Set([...prev, userId]));
    }
  };

  const handleNext = async () => {
    // Validation for profile step
    if (currentStep === 1 && !displayName.trim()) {
      toast.error("Please enter a display name");
      return;
    }

    // Load suggestions when entering follow step
    if (currentStep === 3) {
      loadSuggestedUsers();
    }

    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);

    try {
      // Upload avatar if selected
      let finalAvatarUrl = avatarUrl;
      if (avatarFile) {
        finalAvatarUrl = await uploadAvatar();
      }

      // Save profile
      const result = await completeOnboarding({
        displayName: displayName.trim(),
        bio: bio.trim() || undefined,
        avatarUrl: finalAvatarUrl || undefined,
        showSensitivePosts,
        blurSensitiveByDefault,
      });

      if (result.success) {
        toast.success("Welcome to be.vocl!");
        onComplete();
      } else {
        toast.error(result.error || "Failed to complete setup");
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0: // Welcome
        return (
          <div className="text-center space-y-6">
            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-vocl-accent to-vocl-accent-hover flex items-center justify-center">
              <IconSparkles size={48} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Welcome to be.vocl!
              </h2>
              <p className="text-foreground/60">
                Hey @{username}, let&apos;s set up your profile and get you started.
              </p>
            </div>
            <div className="text-sm text-foreground/40">
              This will only take a minute.
            </div>
          </div>
        );

      case 1: // Profile
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-foreground mb-2">
                Tell us about yourself
              </h2>
              <p className="text-sm text-foreground/60">
                This is how others will see you on be.vocl
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Display Name *
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  maxLength={50}
                  className="w-full px-4 py-3 rounded-xl bg-vocl-surface-dark border border-white/10 text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-vocl-accent"
                  autoFocus
                />
                <p className="text-xs text-foreground/40 mt-1">
                  Your username is @{username}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Bio
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell the world a little about yourself..."
                  maxLength={160}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-vocl-surface-dark border border-white/10 text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-vocl-accent resize-none"
                />
                <p className="text-xs text-foreground/40 mt-1 text-right">
                  {bio.length}/160
                </p>
              </div>
            </div>
          </div>
        );

      case 2: // Avatar
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-foreground mb-2">
                Add a profile photo
              </h2>
              <p className="text-sm text-foreground/60">
                Help people recognize you
              </p>
            </div>

            <div className="flex flex-col items-center gap-4">
              <div className="relative w-32 h-32 rounded-full overflow-hidden bg-vocl-surface-dark border-2 border-dashed border-white/20">
                {avatarUrl ? (
                  <>
                    <Image
                      src={avatarUrl}
                      alt="Profile preview"
                      fill
                      className="object-cover"
                    />
                    <button
                      onClick={() => {
                        setAvatarUrl(null);
                        setAvatarFile(null);
                      }}
                      className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                    >
                      <IconX size={16} />
                    </button>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <IconUser size={48} className="text-foreground/30" />
                  </div>
                )}
              </div>

              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarSelect}
                  className="hidden"
                />
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-vocl-surface-dark border border-white/10 text-foreground hover:bg-white/5 transition-colors">
                  <IconUpload size={18} />
                  {avatarUrl ? "Change photo" : "Upload photo"}
                </span>
              </label>

              <button
                onClick={handleNext}
                className="text-sm text-foreground/50 hover:text-foreground transition-colors"
              >
                Skip for now
              </button>
            </div>
          </div>
        );

      case 3: // Content Preferences
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-foreground mb-2">
                Content preferences
              </h2>
              <p className="text-sm text-foreground/60">
                Customize what you see on be.vocl
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-vocl-surface-dark border border-white/10">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {showSensitivePosts ? (
                        <IconEye size={18} className="text-vocl-accent" />
                      ) : (
                        <IconEyeOff size={18} className="text-foreground/50" />
                      )}
                      <span className="font-medium text-foreground">
                        Show sensitive content
                      </span>
                    </div>
                    <p className="text-sm text-foreground/50">
                      Some posts may contain adult themes or mature content
                    </p>
                  </div>
                  <button
                    onClick={() => setShowSensitivePosts(!showSensitivePosts)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      showSensitivePosts ? "bg-vocl-accent" : "bg-white/10"
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        showSensitivePosts ? "left-7" : "left-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {showSensitivePosts && (
                <div className="p-4 rounded-xl bg-vocl-surface-dark border border-white/10">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <span className="font-medium text-foreground block mb-1">
                        Blur sensitive content by default
                      </span>
                      <p className="text-sm text-foreground/50">
                        Sensitive content will be blurred until you tap to reveal
                      </p>
                    </div>
                    <button
                      onClick={() => setBlurSensitiveByDefault(!blurSensitiveByDefault)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        blurSensitiveByDefault ? "bg-vocl-accent" : "bg-white/10"
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                          blurSensitiveByDefault ? "left-7" : "left-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}

              <p className="text-xs text-foreground/40 text-center">
                You can change these settings anytime in Settings &gt; Content
              </p>
            </div>
          </div>
        );

      case 4: // Follow Suggestions
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-foreground mb-2">
                Find people to follow
              </h2>
              <p className="text-sm text-foreground/60">
                Discover interesting creators on be.vocl
              </p>
            </div>

            {loadingSuggestions ? (
              <div className="flex items-center justify-center py-8">
                <IconLoader2 size={32} className="animate-spin text-vocl-accent" />
              </div>
            ) : suggestedUsers.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {suggestedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-vocl-surface-dark"
                  >
                    <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                      {user.avatarUrl ? (
                        <Image
                          src={user.avatarUrl}
                          alt={user.username}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-vocl-accent to-vocl-accent-hover flex items-center justify-center">
                          <span className="text-white font-bold">
                            {user.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {user.displayName || user.username}
                      </p>
                      <p className="text-xs text-foreground/50">
                        @{user.username}
                      </p>
                    </div>
                    <button
                      onClick={() => handleFollow(user.id)}
                      disabled={followedUsers.has(user.id)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        followedUsers.has(user.id)
                          ? "bg-white/10 text-foreground/50"
                          : "bg-vocl-accent text-white hover:bg-vocl-accent-hover"
                      }`}
                    >
                      {followedUsers.has(user.id) ? (
                        <span className="flex items-center gap-1">
                          <IconCheck size={14} />
                          Following
                        </span>
                      ) : (
                        "Follow"
                      )}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-foreground/50">
                No suggestions available right now
              </div>
            )}

            <p className="text-xs text-foreground/40 text-center">
              You can find more people to follow using Search
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  const isLastStep = currentStep === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((step, index) => (
            <div
              key={step.id}
              className={`w-2 h-2 rounded-full transition-colors ${
                index <= currentStep ? "bg-vocl-accent" : "bg-white/20"
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="bg-vocl-surface rounded-2xl border border-white/10 p-6">
          {renderStep()}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-6">
          {currentStep > 0 ? (
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-4 py-2 text-foreground/60 hover:text-foreground transition-colors"
            >
              <IconArrowLeft size={18} />
              Back
            </button>
          ) : (
            <div />
          )}

          {isLastStep ? (
            <button
              onClick={handleComplete}
              disabled={isSubmitting || isUploadingAvatar}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-vocl-accent text-white font-medium hover:bg-vocl-accent-hover transition-colors disabled:opacity-50"
            >
              {isSubmitting || isUploadingAvatar ? (
                <>
                  <IconLoader2 size={18} className="animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  Get Started
                  <IconCheck size={18} />
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-vocl-accent text-white font-medium hover:bg-vocl-accent-hover transition-colors"
            >
              Continue
              <IconArrowRight size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

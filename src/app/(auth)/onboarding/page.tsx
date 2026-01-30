"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { OnboardingWizard } from "@/components/auth";
import { checkOnboardingStatus } from "@/actions/profile";
import { useAuth } from "@/hooks/useAuth";
import { IconLoader2 } from "@tabler/icons-react";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, profile, isLoading: authLoading } = useAuth();
  const [isChecking, setIsChecking] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      if (authLoading) return;

      if (!user) {
        router.replace("/login");
        return;
      }

      const result = await checkOnboardingStatus();

      if (result.success && result.isComplete) {
        // Already completed onboarding, redirect to feed
        router.replace("/feed");
        return;
      }

      setNeedsOnboarding(true);
      setIsChecking(false);
    };

    checkStatus();
  }, [user, authLoading, router]);

  const handleComplete = () => {
    router.push("/feed");
  };

  if (authLoading || isChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <IconLoader2 size={40} className="animate-spin text-vocl-accent mx-auto mb-4" />
          <p className="text-foreground/50">Loading...</p>
        </div>
      </div>
    );
  }

  if (!needsOnboarding || !profile) {
    return null;
  }

  return (
    <OnboardingWizard
      username={profile.username}
      onComplete={handleComplete}
    />
  );
}

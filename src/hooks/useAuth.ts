"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface Profile {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  role: number;
}

interface ProfileRow {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  role: number | null;
}

interface UseAuthReturn {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

/**
 * Hook for accessing authentication state and current user profile
 */
export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    // Get initial session with error handling
    const getSession = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError) {
          console.error("Auth error:", authError);
          setIsLoading(false);
          return;
        }

        setUser(user);

        if (user) {
          // Fetch profile
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("id, username, display_name, avatar_url, role")
            .eq("id", user.id)
            .single<ProfileRow>();

          if (profileError) {
            console.error("Profile fetch error:", profileError);
          } else if (profileData) {
            setProfile({
              id: profileData.id,
              username: profileData.username,
              displayName: profileData.display_name || undefined,
              avatarUrl: profileData.avatar_url || undefined,
              role: profileData.role || 0,
            });
          }
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    // Add timeout fallback
    const timeoutId = setTimeout(() => {
      console.warn("Auth check timed out");
      setIsLoading(false);
    }, 10000);

    getSession().finally(() => clearTimeout(timeoutId));

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const newUser = session?.user ?? null;
        setUser(newUser);

        if (newUser) {
          // Fetch profile on auth change
          const { data: profileData } = await supabase
            .from("profiles")
            .select("id, username, display_name, avatar_url, role")
            .eq("id", newUser.id)
            .single<ProfileRow>();

          if (profileData) {
            setProfile({
              id: profileData.id,
              username: profileData.username,
              displayName: profileData.display_name || undefined,
              avatarUrl: profileData.avatar_url || undefined,
              role: profileData.role || 0,
            });
          }
        } else {
          setProfile(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    user,
    profile,
    isLoading,
    isAuthenticated: !!user,
  };
}

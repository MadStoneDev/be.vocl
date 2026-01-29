"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";

interface Profile {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
}

interface ProfileRow {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
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
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Skip if Supabase is not configured
    if (!supabaseUrl || !supabaseAnonKey) {
      setIsLoading(false);
      return;
    }

    const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

    // Get initial session
    const getSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        // Fetch profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .eq("id", user.id)
          .single<ProfileRow>();

        if (profileData) {
          setProfile({
            id: profileData.id,
            username: profileData.username,
            displayName: profileData.display_name || undefined,
            avatarUrl: profileData.avatar_url || undefined,
          });
        }
      }

      setIsLoading(false);
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const newUser = session?.user ?? null;
        setUser(newUser);

        if (newUser) {
          // Fetch profile on auth change
          const { data: profileData } = await supabase
            .from("profiles")
            .select("id, username, display_name, avatar_url")
            .eq("id", newUser.id)
            .single<ProfileRow>();

          if (profileData) {
            setProfile({
              id: profileData.id,
              username: profileData.username,
              displayName: profileData.display_name || undefined,
              avatarUrl: profileData.avatar_url || undefined,
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

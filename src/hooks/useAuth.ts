"use client";

import { useState, useEffect, useRef } from "react";
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

// Cache the supabase client
let cachedClient: ReturnType<typeof createClient> | null = null;
function getSupabaseClient() {
  if (!cachedClient) {
    cachedClient = createClient();
  }
  return cachedClient;
}

/**
 * Hook for accessing authentication state and current user profile
 */
export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const fetchedRef = useRef(false);

  useEffect(() => {
    // Prevent double-fetch in strict mode
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const supabase = getSupabaseClient();

    // Fetch profile helper
    const fetchProfile = async (userId: string) => {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, role")
        .eq("id", userId)
        .single<ProfileRow>();

      if (profileError) {
        console.error("Profile fetch error:", profileError);
        return null;
      }

      if (profileData) {
        return {
          id: profileData.id,
          username: profileData.username,
          displayName: profileData.display_name || undefined,
          avatarUrl: profileData.avatar_url || undefined,
          role: profileData.role ?? 0,
        };
      }
      return null;
    };

    // Get initial session
    const getSession = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError) {
          console.error("Auth error:", authError);
          setIsLoading(false);
          return;
        }

        setUser(user);

        // Set loading false immediately after auth check
        // Profile will load in parallel
        setIsLoading(false);

        if (user) {
          const profileData = await fetchProfile(user.id);
          if (profileData) {
            setProfile(profileData);
          }
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        setIsLoading(false);
      }
    };

    // Add timeout fallback
    const timeoutId = setTimeout(() => {
      console.warn("Auth check timed out");
      setIsLoading(false);
    }, 5000);

    getSession().finally(() => clearTimeout(timeoutId));

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Skip INITIAL_SESSION as we handle it above
        if (event === "INITIAL_SESSION") return;

        const newUser = session?.user ?? null;
        setUser(newUser);

        if (newUser) {
          const profileData = await fetchProfile(newUser.id);
          if (profileData) {
            setProfile(profileData);
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

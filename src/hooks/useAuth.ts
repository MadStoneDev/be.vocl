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

interface UseAuthReturn {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const profileFetchedRef = useRef(false);

  useEffect(() => {
    const supabase = createClient();
    let isMounted = true;

    const fetchProfile = async (userId: string): Promise<Profile | null> => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url, role")
          .eq("id", userId)
          .maybeSingle();

        if (error) {
          console.error("[useAuth] Profile fetch error:", error);
          return null;
        }

        if (data) {
          return {
            id: data.id,
            username: data.username,
            displayName: data.display_name || undefined,
            avatarUrl: data.avatar_url || undefined,
            role: data.role ?? 0,
          };
        }
        return null;
      } catch (err) {
        console.error("[useAuth] Profile fetch exception:", err);
        return null;
      }
    };

    // Use onAuthStateChange for all auth events (including initial)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        const newUser = session?.user ?? null;
        setUser(newUser);

        if (newUser && !profileFetchedRef.current) {
          profileFetchedRef.current = true;

          // Defer to break out of onAuthStateChange callback context
          // This prevents deadlocks when calling Supabase methods inside the callback
          setTimeout(async () => {
            const profileData = await fetchProfile(newUser.id);
            if (isMounted) {
              setProfile(profileData);
              setIsLoading(false);
            }
          }, 0);
        } else if (!newUser) {
          profileFetchedRef.current = false;
          setProfile(null);
          setIsLoading(false);
        } else {
          setIsLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
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

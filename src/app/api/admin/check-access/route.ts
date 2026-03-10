import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ authorized: false });
    }

    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    // Require at least moderator role (5) for admin access
    const authorized = profile?.role >= 5;

    return NextResponse.json({ authorized });
  } catch (error) {
    console.error("Admin access check error:", error);
    return NextResponse.json({ authorized: false });
  }
}

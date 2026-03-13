import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { downloadLocation } = await request.json();

    if (!downloadLocation) {
      return NextResponse.json(
        { error: "downloadLocation is required" },
        { status: 400 }
      );
    }

    const accessKey = process.env.UNSPLASH_ACCESS_KEY;
    if (!accessKey) {
      return NextResponse.json(
        { error: "Unsplash integration not configured" },
        { status: 200 }
      );
    }

    // Trigger the download tracking endpoint (required by Unsplash API guidelines)
    await fetch(downloadLocation, {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unsplash download tracking error:", error);
    return NextResponse.json(
      { error: "Download tracking failed" },
      { status: 500 }
    );
  }
}

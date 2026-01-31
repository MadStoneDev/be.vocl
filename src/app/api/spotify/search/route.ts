import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchTracks } from "@/lib/spotify";

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const query = request.nextUrl.searchParams.get("q");
    const limit = request.nextUrl.searchParams.get("limit");

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: "Query must be at least 2 characters" },
        { status: 400 }
      );
    }

    const results = await searchTracks(query, limit ? parseInt(limit, 10) : 5);

    return NextResponse.json(results);
  } catch (error) {
    console.error("Spotify search error:", error);

    // Check if Spotify is not configured
    if (error instanceof Error && error.message.includes("not configured")) {
      return NextResponse.json(
        { error: "Spotify integration not configured", tracks: [] },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}

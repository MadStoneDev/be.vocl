import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
    const page = request.nextUrl.searchParams.get("page") || "1";
    const perPage = request.nextUrl.searchParams.get("per_page") || "20";

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: "Query must be at least 2 characters" },
        { status: 400 }
      );
    }

    const accessKey = process.env.UNSPLASH_ACCESS_KEY;
    if (!accessKey) {
      return NextResponse.json(
        { error: "Unsplash integration not configured", results: [], total: 0, total_pages: 0 },
        { status: 200 }
      );
    }

    const url = new URL("https://api.unsplash.com/search/photos");
    url.searchParams.set("query", query);
    url.searchParams.set("page", page);
    url.searchParams.set("per_page", perPage);

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
      },
    });

    if (!res.ok) {
      console.error("Unsplash API error:", res.status, await res.text());
      return NextResponse.json(
        { error: "Unsplash search failed" },
        { status: 500 }
      );
    }

    const data = await res.json();

    // Shape the response to only include what we need
    const results = data.results.map((photo: any) => ({
      id: photo.id,
      urls: {
        small: photo.urls.small,
        regular: photo.urls.regular,
        full: photo.urls.full,
        thumb: photo.urls.thumb,
      },
      alt_description: photo.alt_description,
      user: {
        name: photo.user.name,
        username: photo.user.username,
        links: { html: photo.user.links.html },
      },
      links: { download_location: photo.links.download_location },
      width: photo.width,
      height: photo.height,
    }));

    return NextResponse.json({
      results,
      total: data.total,
      total_pages: data.total_pages,
    });
  } catch (error) {
    console.error("Unsplash search error:", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}

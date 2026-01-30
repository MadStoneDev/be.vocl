import { NextRequest, NextResponse } from "next/server";

interface TenorGif {
  id: string;
  url: string;
  previewUrl: string;
  width: number;
  height: number;
}

interface TenorResponse {
  results: Array<{
    id: string;
    media_formats: {
      gif: { url: string; dims: [number, number] };
      tinygif: { url: string; dims: [number, number] };
      nanogif: { url: string; dims: [number, number] };
    };
  }>;
  next: string;
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");
  const limit = request.nextUrl.searchParams.get("limit") || "20";
  const pos = request.nextUrl.searchParams.get("pos") || "";

  const apiKey = process.env.TENOR_API_KEY;

  if (!apiKey) {
    // Return mock data if no API key configured
    return NextResponse.json({
      gifs: getMockGifs(),
      next: "",
    });
  }

  try {
    let url: string;

    if (query) {
      // Search for GIFs
      url = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${apiKey}&limit=${limit}&media_filter=gif,tinygif&contentfilter=medium`;
    } else {
      // Get trending GIFs
      url = `https://tenor.googleapis.com/v2/featured?key=${apiKey}&limit=${limit}&media_filter=gif,tinygif&contentfilter=medium`;
    }

    if (pos) {
      url += `&pos=${pos}`;
    }

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Tenor API error: ${response.status}`);
    }

    const data: TenorResponse = await response.json();

    const gifs: TenorGif[] = data.results.map((result) => ({
      id: result.id,
      url: result.media_formats.gif.url,
      previewUrl: result.media_formats.tinygif?.url || result.media_formats.nanogif?.url || result.media_formats.gif.url,
      width: result.media_formats.gif.dims[0],
      height: result.media_formats.gif.dims[1],
    }));

    return NextResponse.json({
      gifs,
      next: data.next || "",
    });
  } catch (error) {
    console.error("Tenor API error:", error);
    return NextResponse.json({
      gifs: getMockGifs(),
      next: "",
    });
  }
}

// Mock GIFs for development without API key
function getMockGifs(): TenorGif[] {
  return [
    {
      id: "mock1",
      url: "https://media.tenor.com/images/example1.gif",
      previewUrl: "https://media.tenor.com/images/example1_preview.gif",
      width: 200,
      height: 200,
    },
  ];
}

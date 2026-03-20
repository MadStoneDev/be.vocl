import { NextRequest, NextResponse } from "next/server";

interface GiphyGif {
  id: string;
  url: string;
  previewUrl: string;
  width: number;
  height: number;
}

interface GiphyResponse {
  data: Array<{
    id: string;
    images: {
      original: { url: string; width: string; height: string };
      fixed_width: { url: string; width: string; height: string };
      fixed_width_small: { url: string; width: string; height: string };
      preview_gif: { url: string; width: string; height: string };
    };
  }>;
  pagination: { total_count: number; count: number; offset: number };
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");
  const limit = request.nextUrl.searchParams.get("limit") || "20";
  const pos = request.nextUrl.searchParams.get("pos") || "";

  const apiKey = process.env.GIPHY_API_KEY;

  if (!apiKey) {
    // Return mock data if no API key configured
    return NextResponse.json({
      gifs: getMockGifs(),
      next: "",
    });
  }

  try {
    const offset = pos || "0";
    let url: string;

    if (query) {
      // Search for GIFs
      url = `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}&rating=pg-13`;
    } else {
      // Get trending GIFs
      url = `https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=${limit}&offset=${offset}&rating=pg-13`;
    }

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Giphy API error: ${response.status}`);
    }

    const data: GiphyResponse = await response.json();

    const gifs: GiphyGif[] = data.data.map((result) => ({
      id: result.id,
      url: result.images.original.url,
      previewUrl: result.images.fixed_width_small?.url || result.images.fixed_width?.url || result.images.original.url,
      width: parseInt(result.images.original.width, 10),
      height: parseInt(result.images.original.height, 10),
    }));

    const currentOffset = parseInt(offset, 10);
    const limitNum = parseInt(limit, 10);
    const nextOffset = currentOffset + limitNum;
    const hasMore = data.pagination.total_count > nextOffset;

    return NextResponse.json({
      gifs,
      next: hasMore ? String(nextOffset) : "",
    });
  } catch (error) {
    console.error("Giphy API error:", error);
    return NextResponse.json({
      gifs: getMockGifs(),
      next: "",
    });
  }
}

// Mock GIFs for development without API key
function getMockGifs(): GiphyGif[] {
  return [
    {
      id: "mock1",
      url: "https://media.giphy.com/media/example1/giphy.gif",
      previewUrl: "https://media.giphy.com/media/example1/100w.gif",
      width: 200,
      height: 200,
    },
  ];
}

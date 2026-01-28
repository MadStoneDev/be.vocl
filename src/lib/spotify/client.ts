interface SpotifyCredentials {
  accessToken: string;
  expiresAt: number;
}

let cachedCredentials: SpotifyCredentials | null = null;

/**
 * Get Spotify access token using Client Credentials flow
 */
async function getAccessToken(): Promise<string> {
  // Return cached token if still valid
  if (cachedCredentials && Date.now() < cachedCredentials.expiresAt) {
    return cachedCredentials.accessToken;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Spotify credentials not configured");
  }

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    throw new Error("Failed to get Spotify access token");
  }

  const data = await response.json();

  cachedCredentials = {
    accessToken: data.access_token,
    // Expire 60 seconds early to be safe
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };

  return cachedCredentials.accessToken;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artist: string;
  album: string;
  albumArt: string | null;
  previewUrl: string | null;
  duration: number;
  externalUrl: string;
}

export interface SpotifySearchResult {
  tracks: SpotifyTrack[];
}

/**
 * Search for tracks on Spotify
 */
export async function searchTracks(
  query: string,
  limit = 5
): Promise<SpotifySearchResult> {
  const token = await getAccessToken();

  const params = new URLSearchParams({
    q: query,
    type: "track",
    limit: String(limit),
  });

  const response = await fetch(
    `https://api.spotify.com/v1/search?${params}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!response.ok) {
    throw new Error("Spotify search failed");
  }

  const data = await response.json();

  return {
    tracks: data.tracks.items.map((track: any) => ({
      id: track.id,
      name: track.name,
      artist: track.artists.map((a: any) => a.name).join(", "),
      album: track.album.name,
      albumArt: track.album.images[0]?.url || null,
      previewUrl: track.preview_url,
      duration: track.duration_ms,
      externalUrl: track.external_urls.spotify,
    })),
  };
}

/**
 * Get a single track by ID
 */
export async function getTrack(trackId: string): Promise<SpotifyTrack | null> {
  const token = await getAccessToken();

  const response = await fetch(
    `https://api.spotify.com/v1/tracks/${trackId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!response.ok) {
    return null;
  }

  const track = await response.json();

  return {
    id: track.id,
    name: track.name,
    artist: track.artists.map((a: any) => a.name).join(", "),
    album: track.album.name,
    albumArt: track.album.images[0]?.url || null,
    previewUrl: track.preview_url,
    duration: track.duration_ms,
    externalUrl: track.external_urls.spotify,
  };
}

/**
 * Whisper transcription wrapper.
 *
 * Posts the audio at `audioUrl` to OpenAI's Whisper API and returns the transcript.
 * Returns null on any failure (caller decides what to do).
 */
export async function transcribeAudio(audioUrl: string): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("[whisper] OPENAI_API_KEY missing — skipping transcription");
    return null;
  }

  try {
    const audioRes = await fetch(audioUrl);
    if (!audioRes.ok) {
      console.error("[whisper] Failed to fetch audio:", audioRes.status);
      return null;
    }
    const audioBlob = await audioRes.blob();
    const filename = audioUrl.split("/").pop() || "audio.webm";

    const formData = new FormData();
    formData.append("file", audioBlob, filename);
    formData.append("model", "whisper-1");
    formData.append("response_format", "text");

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[whisper] OpenAI error:", res.status, text);
      return null;
    }

    const transcript = await res.text();
    return transcript.trim();
  } catch (e) {
    console.error("[whisper] Unexpected error:", e);
    return null;
  }
}

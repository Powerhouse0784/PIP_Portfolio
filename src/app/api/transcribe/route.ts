import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_AUDIO_BYTES = 8 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Voice transcription is not configured on the server. Please use text input." },
      { status: 503 }
    );
  }

  try {
    const form = await request.formData();
    const file = form.get("audio");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Please record audio before sending." }, { status: 400 });
    }
    if (file.size <= 0 || file.size > MAX_AUDIO_BYTES) {
      return NextResponse.json({ error: "Audio must be smaller than 8 MB. Please try a shorter recording." }, { status: 413 });
    }

    const mimeType = file.type || "audio/webm";
    const bytes = Buffer.from(await file.arrayBuffer());
    const base64Audio = bytes.toString("base64");
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: "Transcribe the audio exactly as spoken. Return only the transcription, without commentary." },
              { inline_data: { mime_type: mimeType, data: base64Audio } }
            ]
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 512 }
        }),
        cache: "no-store"
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: response.status === 429 ? "Voice transcription is busy. Please try again shortly." : "The speech service could not transcribe this recording. You can type instead." },
        { status: response.status === 429 ? 429 : 502 }
      );
    }

    const json: unknown = await response.json();
    const data = json as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };
    const transcript = (data.candidates?.[0]?.content?.parts ?? [])
      .map((part) => part.text ?? "")
      .join(" ")
      .trim()
      .slice(0, 1200);

    if (!transcript) {
      return NextResponse.json({ error: "I couldn't hear clear words. Try speaking closer to the microphone." }, { status: 422 });
    }
    return NextResponse.json({ text: transcript }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Voice input failed. Check microphone permission and try again, or type instead." }, { status: 500 });
  }
}

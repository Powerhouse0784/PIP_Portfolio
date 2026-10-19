import { NextResponse } from "next/server";
import { checkLimit, visitorKey, type Policy } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const POLICY: Policy = { name: "transcribe", cooldown: 2, perHour: 25 };
const BASE = process.env.GEMINI_API_BASE ?? "https://generativelanguage.googleapis.com/v1beta";
const MODEL = process.env.GEMINI_MODEL ?? "gemini-flash-latest";
const MAX_BYTES = 8 * 1024 * 1024;

/** Server-side speech-to-text fallback for browsers whose native speech service is unavailable. API keys never reach the browser. */
export async function POST(request: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ error: "Voice fallback needs GEMINI_API_KEY on the server. You can still type to Pip." }, { status: 503 });
  const limit = await checkLimit(visitorKey(request), POLICY);
  if (!limit.ok) return NextResponse.json({ error: "Pip’s ears need a little rest. Please try again shortly." }, { status: 429 });

  let form: FormData;
  try { form = await request.formData(); } catch { return NextResponse.json({ error: "Invalid audio upload." }, { status: 400 }); }
  const audio = form.get("audio");
  if (!(audio instanceof File) || !audio.size) return NextResponse.json({ error: "No audio was recorded. Try again." }, { status: 400 });
  if (audio.size > MAX_BYTES) return NextResponse.json({ error: "That recording is too long. Please try a shorter message." }, { status: 413 });
  const mimeType = audio.type.split(";")[0] || "audio/webm";
  if (!/^audio\/(webm|mp4|ogg|wav|mpeg|mp3)$/.test(mimeType)) return NextResponse.json({ error: "This browser’s audio format isn’t supported. Try typing instead." }, { status: 415 });

  try {
    const bytes = Buffer.from(await audio.arrayBuffer());
    const response = await fetch(`${BASE}/models/${MODEL}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ parts: [
          { text: "Transcribe the spoken words in this audio exactly. Return only the transcription, with no explanation. If no intelligible speech is present, return an empty string." },
          { inlineData: { mimeType, data: bytes.toString("base64") } },
        ] }],
        generationConfig: { temperature: 0, maxOutputTokens: 160 },
      }),
      signal: AbortSignal.timeout(20000), cache: "no-store",
    });
    if (!response.ok) {
      const status = response.status;
      return NextResponse.json({ error: status === 429 ? "Voice transcription is busy. Please try again in a moment." : "Pip couldn’t transcribe that audio. Please try again or type your message." }, { status: status === 429 ? 429 : 502 });
    }
    const json = await response.json() as { candidates?: { content?: { parts?: { text?: string }[] }[] }[] };
    const text = (json.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join(" ").trim().slice(0, 120);
    if (!text) return NextResponse.json({ error: "I couldn’t hear clear words. Try speaking a little closer to the microphone." }, { status: 422 });
    return NextResponse.json({ text }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[transcribe]", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Voice transcription couldn’t reach the AI service. Check your connection and try again." }, { status: 502 });
  }
}

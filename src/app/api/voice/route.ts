import { NextResponse } from "next/server";
import { z } from "zod";
import { FEEL_LIST, type Feel } from "@/lib/feel";
import { checkLimit, visitorKey, type Policy } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Gemini text-to-speech (free tier). The browser falls back to its own voice if this is unavailable or rate-limited. */
const BASE = process.env.GEMINI_API_BASE ?? "https://generativelanguage.googleapis.com/v1beta";
const MODEL = process.env.GEMINI_TTS_MODEL ?? "gemini-3.1-flash-tts-preview";
const VOICE_NAME = process.env.GEMINI_VOICE ?? "Leda";
const VOICE: Policy = { name: "voice", cooldown: 2, perHour: 40 };

const schema = z.object({ text: z.string().trim().min(1).max(260), mood: z.enum(FEEL_LIST).optional() }).strict();

const STYLE: Record<Feel, string> = {
  happy: "warmly and cheerfully",
  sleepy: "in a sleepy, yawning, very soft voice",
  giggly: "playfully, with a little giggle",
  curious: "curious and wondering, with a rising tone",
  proud: "proudly and brightly",
  shy: "shyly, quietly and sweetly",
};

function wav(pcm: Buffer, rate: number) {
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + pcm.length, 4); h.write("WAVE", 8); h.write("fmt ", 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write("data", 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

export async function POST(request: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ unavailable: true });

  const raw = await request.text();
  if (raw.length > 1200) return NextResponse.json({ error: "Too much to say." }, { status: 413 });
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Please send a short line." }, { status: 400 });

  const spoken = parsed.data.text.replace(/\*[^*]+\*/g, "").replace(/[{}<>]/g, "").trim();
  if (!spoken) return NextResponse.json({ unavailable: true });

  const verdict = await checkLimit(visitorKey(request), VOICE);
  if (!verdict.ok) return NextResponse.json({ error: "Pip’s voice is resting." }, { status: 429 });

  try {
    const res = await fetch(`${BASE}/models/${MODEL}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Say this as a tiny, gentle, friendly baby character, ${STYLE[parsed.data.mood ?? "happy"]}: ${spoken}` }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE_NAME } } },
        },
      }),
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`gemini-tts ${res.status}`);
    const j = (await res.json()) as { candidates?: { content?: { parts?: { inlineData?: { data?: string; mimeType?: string } }[] } }[] };
    const part = j.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData;
    if (!part?.data) return NextResponse.json({ unavailable: true });
    const rate = Number(/rate=(\d+)/.exec(part.mimeType ?? "")?.[1]) || 24000;
    const audio = wav(Buffer.from(part.data, "base64"), rate);
    return new Response(new Uint8Array(audio), { headers: { "Content-Type": "audio/wav", "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[voice]", e instanceof Error ? e.message : e);
    return NextResponse.json({ unavailable: true });
  }
}

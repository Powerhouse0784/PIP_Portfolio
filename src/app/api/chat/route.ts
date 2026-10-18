import { NextResponse } from "next/server";
import { z } from "zod";
import { aiConfigured, clean, generate, PIP_CANON } from "@/lib/llm";
import { chatSpark } from "@/lib/sparks";
import { ACT_LIST, isAct } from "@/lib/pipAct";
import { FEEL_LIST, inferFeel, isFeel } from "@/lib/feel";
import { CHAT, checkLimit, visitorKey } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Sections Pip is allowed to point visitors to. Anything else the model invents is dropped. */
const SECTIONS = ["about", "projects", "storybook", "toys", "growth", "catcher", "darkroom", "dreammaker", "mobile3d", "story", "guestbook", "daily"] as const;

const schema = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(300) })).min(1).max(8),
}).strict();

const SYSTEM = `${PIP_CANON}
Reply in 1 to 3 short sentences (under 45 words). Stay in character as Pip. You may use one *giggle* or *yawn* style action.
This website has these places you can point people to: ${SECTIONS.join(", ")}. If the visitor would enjoy one of them, end your reply with a tag like {go:toys} using exactly one id from that list. Only add a tag when it genuinely fits.
Always finish with one more tag, {mood:X}, where X is exactly one of: ${FEEL_LIST.join(", ")}. It is the feeling your reply expresses (giggly for jokes and tickles, sleepy for yawns, curious for questions, proud when talking about your work, shy when complimented or teased, happy otherwise).
Physical commands: if the visitor asks you to do something (like dance, spin or wink), do it and describe it in a short *action*, then add one tag {act:X} where X is exactly one of: ${ACT_LIST.join(", ")}. Only add an act tag when they actually ask for a move.
Reply in the same language the visitor writes in (English if unsure).`;

export async function POST(request: Request) {
  if (!aiConfigured()) return NextResponse.json({ unavailable: true });

  const raw = await request.text();
  if (raw.length > 4000) return NextResponse.json({ error: "Too much to read, sleepyhead." }, { status: 413 });
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Please send a short message." }, { status: 400 });

  const turns = parsed.data.messages;
  if (turns[turns.length - 1].role !== "user") return NextResponse.json({ error: "Last message must be from you." }, { status: 400 });

  const verdict = await checkLimit(visitorKey(request), CHAT);
  if (!verdict.ok) {
    return NextResponse.json(
      { error: verdict.reason === "cooldown" ? "One moment, I’m still yawning." : "I’m out of words for this hour. Come back after a nap!" },
      { status: 429, headers: { "Retry-After": verdict.reason === "cooldown" ? "2" : "3600" } },
    );
  }

  const out = await generate({ system: `${SYSTEM}\n${chatSpark()}`, turns, maxTokens: 160, temperature: 0.9 });
  if (!out) return NextResponse.json({ unavailable: true });

  const tag = out.match(/\{go:([a-z0-9]+)\}/i)?.[1]?.toLowerCase();
  const go = SECTIONS.find((s) => s === tag);
  const moodTag = out.match(/\{mood:([a-z]+)\}/i)?.[1]?.toLowerCase();
  const reply = clean(out.replace(/\{(go|mood|act):[^}]*\}/gi, ""), 260);
  if (!reply) return NextResponse.json({ unavailable: true });
  const actTag = out.match(/\{act:([a-z]+)\}/i)?.[1]?.toLowerCase();
  return NextResponse.json({ reply, go: go ?? null, mood: isFeel(moodTag) ? moodTag : inferFeel(reply), act: isAct(actTag) ? actTag : null });
}

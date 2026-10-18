import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdmin } from "@/lib/supabaseAdmin";
import { checkLimit, visitorKey } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z
  .object({
    name: z.string().trim().min(1).max(24),
    message: z.string().trim().min(2).max(240),
    website: z.string().max(200).optional(), // honeypot: real people leave it empty
  })
  .strict();

// Links are the #1 guestbook spam vector and this is a cozy wall, so no links.
const LINK = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|io|ru|xyz|top|biz|info|me|co)\b)/i;

// GUESTBOOK_MODERATION=pending -> new notes wait for approval (flip is_approved in Supabase).
const MODERATED = process.env.GUESTBOOK_MODERATION === "pending";

const PUBLIC_COLS = "id, display_name, message, created_at, stars, hearts";
const LEGACY_COLS = "id, display_name, message, created_at";

export async function GET() {
  const db = getAdmin();
  if (!db) return NextResponse.json({ entries: [], unavailable: true });
  const q = (cols: string) => db.from("guestbook_entries").select(cols).eq("is_approved", true).order("created_at", { ascending: false }).limit(30);
  let { data, error } = await q(PUBLIC_COLS);
  // A database that hasn't run supabase/migration-v14.sql yet has no reaction columns: still serve the notes.
  if (error?.code === "42703") ({ data, error } = await q(LEGACY_COLS));
  if (error) {
    console.error("[guestbook:get]", error.code, error.message);
    return NextResponse.json({ entries: [], unavailable: true }); // 200 keeps the browser console clean
  }
  return NextResponse.json({ entries: data ?? [] });
}

export async function POST(request: Request) {
  const db = getAdmin();
  if (!db) return NextResponse.json({ error: "Guestbook is sleeping." }, { status: 503 });

  const raw = await request.text();
  if (raw.length > 2000) return NextResponse.json({ error: "That note is too big." }, { status: 413 });
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Please check your name and message." }, { status: 400 });
  if (parsed.data.website) return NextResponse.json({ ok: true, pending: true }, { status: 202 }); // bot: pretend success
  if (LINK.test(parsed.data.name) || LINK.test(parsed.data.message)) {
    return NextResponse.json({ error: "No links in the nursery, please. Just kind words!" }, { status: 400 });
  }

  const verdict = await checkLimit(visitorKey(request));
  if (!verdict.ok) {
    return NextResponse.json(
      { error: verdict.reason === "cooldown" ? "Slow down a little, sleepyhead." : "That's plenty of notes for one hour. Come back later!" },
      { status: 429, headers: { "Retry-After": verdict.reason === "cooldown" ? "20" : "3600" } },
    );
  }

  const { data, error } = await db
    .from("guestbook_entries")
    .insert({ display_name: parsed.data.name, message: parsed.data.message, is_approved: !MODERATED })
    .select("id, display_name, message, created_at")
    .single();
  if (error) {
    console.error("[guestbook:post]", error.code, error.message);
    return NextResponse.json({ error: "Could not save your note." }, { status: 500 });
  }
  if (MODERATED) return NextResponse.json({ ok: true, pending: true }, { status: 202 });
  return NextResponse.json({ entry: data }, { status: 201 });
}

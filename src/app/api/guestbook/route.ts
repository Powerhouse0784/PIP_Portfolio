import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z
  .object({
    name: z.string().trim().min(1).max(24),
    message: z.string().trim().min(2).max(240),
    website: z.string().max(200).optional(), // honeypot: real people leave it empty
  })
  .strict();

// Best-effort per-instance limiter. For real protection use Upstash/Vercel KV or edge rate limiting.
const last = new Map<string, number>();

export async function GET() {
  const db = getAdmin();
  if (!db) return NextResponse.json({ error: "Guestbook is sleeping." }, { status: 503 });
  const { data, error } = await db
    .from("guestbook_entries")
    .select("id, display_name, message, created_at")
    .eq("is_approved", true)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) return NextResponse.json({ error: "Could not load entries" }, { status: 500 });
  return NextResponse.json({ entries: data ?? [] });
}

export async function POST(request: Request) {
  const db = getAdmin();
  if (!db) return NextResponse.json({ error: "Guestbook is sleeping." }, { status: 503 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
  const now = Date.now();
  if (now - (last.get(ip) ?? 0) < 10_000) {
    return NextResponse.json({ error: "Slow down a little, sleepyhead." }, { status: 429 });
  }
  last.set(ip, now);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check your name and message." }, { status: 400 });
  }
  if (parsed.data.website) return NextResponse.json({ ok: true }, { status: 201 }); // bot: pretend success

  const { data, error } = await db
    .from("guestbook_entries")
    .insert({ display_name: parsed.data.name, message: parsed.data.message, is_approved: true })
    .select("id, display_name, message, created_at")
    .single();
  if (error) return NextResponse.json({ error: "Could not save your note." }, { status: 500 });
  return NextResponse.json({ entry: data }, { status: 201 });
}

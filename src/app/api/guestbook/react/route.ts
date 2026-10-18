import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdmin } from "@/lib/supabaseAdmin";
import { REACT, checkLimit, visitorKey } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ id: z.number().int().positive().max(2_000_000_000), kind: z.enum(["star", "heart"]) }).strict();

/** One star and one heart per visitor per note (enforced in Postgres, keyed by a salted hash of the IP). */
export async function POST(request: Request) {
  const db = getAdmin();
  if (!db) return NextResponse.json({ error: "The guestbook is sleeping." }, { status: 503 });

  const raw = await request.text();
  if (raw.length > 200) return NextResponse.json({ error: "Too big." }, { status: 413 });
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Please send a note id and a reaction." }, { status: 400 });

  const key = visitorKey(request);
  const verdict = await checkLimit(key, REACT);
  if (!verdict.ok) {
    return NextResponse.json(
      { error: verdict.reason === "cooldown" ? "Easy, little one." : "That’s plenty of stars for one hour." },
      { status: 429, headers: { "Retry-After": verdict.reason === "cooldown" ? "1" : "3600" } },
    );
  }

  const { data, error } = await db.rpc("react_guestbook", { p_entry: parsed.data.id, p_visitor: key, p_kind: parsed.data.kind });
  if (error) {
    console.error("[guestbook:react]", error.code, error.message);
    return NextResponse.json({ error: "Could not send that just now." }, { status: 500 });
  }
  const row = (Array.isArray(data) ? data[0] : data) as { out_stars: number; out_hearts: number; out_added: boolean } | undefined;
  if (!row) return NextResponse.json({ error: "That note isn’t on the wall." }, { status: 404 });
  return NextResponse.json({ stars: row.out_stars, hearts: row.out_hearts, added: row.out_added });
}

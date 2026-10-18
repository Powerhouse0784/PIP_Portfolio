import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdmin } from "@/lib/supabaseAdmin";
import { adminConfigured, checkAdmin } from "@/lib/adminAuth";
import { ADMIN_FAIL, checkLimit, lockedOut, visitorKey } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" };
const json = (body: unknown, status = 200, extra: Record<string, string> = {}) => NextResponse.json(body, { status, headers: { ...HEADERS, ...extra } });

/**
 * Shared gate: not configured -> 503. A visitor who has already failed too many times is locked out BEFORE the token is
 * even compared (so a lucky guess can't slip through). Wrong token -> 401 and counts as a failed attempt.
 */
async function gate(req: Request) {
  if (!adminConfigured()) return { res: json({ error: "Moderation isn’t set up. Add GUESTBOOK_ADMIN_TOKEN (16+ characters) to the server environment." }, 503) };
  const key = visitorKey(req);
  if (await lockedOut(key, ADMIN_FAIL)) return { res: json({ error: "Too many wrong tokens. Try again in an hour." }, 429, { "Retry-After": "3600" }) };
  if (!checkAdmin(req)) {
    const v = await checkLimit(key, ADMIN_FAIL);
    if (!v.ok && v.reason === "hourly") return { res: json({ error: "Too many wrong tokens. Try again in an hour." }, 429, { "Retry-After": "3600" }) };
    return { res: json({ error: "That token doesn’t match." }, 401) };
  }
  const db = getAdmin();
  if (!db) return { res: json({ error: "The database isn’t configured." }, 503) };
  return { db };
}

const STATUS = z.enum(["pending", "approved", "hidden"]);
type Status = z.infer<typeof STATUS>;
const COLS = "id, display_name, message, created_at, is_approved, reviewed_at, stars, hearts";

export async function GET(req: Request) {
  const g = await gate(req);
  if (!g.db) return g.res;
  const status: Status = STATUS.safeParse(new URL(req.url).searchParams.get("status")).data ?? "pending";

  const base = (s: Status, cols: string, head = false) => {
    const q = g.db.from("guestbook_entries").select(cols, head ? { count: "exact", head: true } : undefined);
    return s === "approved" ? q.eq("is_approved", true) : s === "pending" ? q.eq("is_approved", false).is("reviewed_at", null) : q.eq("is_approved", false).not("reviewed_at", "is", null);
  };

  const [list, cp, ca, ch] = await Promise.all([
    base(status, COLS).order("created_at", { ascending: false }).limit(100),
    base("pending", "id", true), base("approved", "id", true), base("hidden", "id", true),
  ]);
  const err = list.error ?? cp.error ?? ca.error ?? ch.error;
  if (err) {
    console.error("[admin:get]", err.code, err.message);
    const missing = err.code === "42703";
    return json({ error: missing ? "Your database needs supabase/migration-v14.sql (reviewed_at column)." : "Could not load notes." }, 500);
  }
  return json({ entries: list.data ?? [], counts: { pending: cp.count ?? 0, approved: ca.count ?? 0, hidden: ch.count ?? 0 } });
}

const patchSchema = z.object({ id: z.number().int().positive(), action: z.enum(["approve", "hide"]) }).strict();

export async function PATCH(req: Request) {
  const g = await gate(req);
  if (!g.db) return g.res;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Bad request." }, 400);
  const { error, data } = await g.db
    .from("guestbook_entries")
    .update({ is_approved: parsed.data.action === "approve", reviewed_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .select("id")
    .maybeSingle();
  if (error) { console.error("[admin:patch]", error.code, error.message); return json({ error: "Could not update that note." }, 500); }
  if (!data) return json({ error: "That note no longer exists." }, 404);
  return json({ ok: true });
}

const delSchema = z.object({ id: z.number().int().positive() }).strict();

export async function DELETE(req: Request) {
  const g = await gate(req);
  if (!g.db) return g.res;
  const parsed = delSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Bad request." }, 400);
  const { error } = await g.db.from("guestbook_entries").delete().eq("id", parsed.data.id);
  if (error) { console.error("[admin:delete]", error.code, error.message); return json({ error: "Could not delete that note." }, 500); }
  return json({ ok: true });
}

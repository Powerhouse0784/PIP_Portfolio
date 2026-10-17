import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The counter is decorative. If the database is unreachable or not set up, answer 200 with
 * `unavailable` so the browser console stays clean, and log the real reason on the server.
 */
function quiet(where: string, err: { code?: string; message?: string }) {
  console.error(`[visits:${where}]`, err.code, err.message);
  const hint =
    err.code === "PGRST202" || err.code === "42883" ? "Run supabase/schema.sql (function increment_site_stat is missing)."
    : err.code === "PGRST205" || err.code === "42P01" ? "Run supabase/schema.sql (table site_stats is missing)."
    : /invalid api key|jwt/i.test(err.message ?? "") ? "SUPABASE_SERVICE_ROLE_KEY looks wrong (use the service_role / secret key, not anon)."
    : /fetch failed|ENOTFOUND/i.test(err.message ?? "") ? "NEXT_PUBLIC_SUPABASE_URL looks wrong or unreachable."
    : undefined;
  return NextResponse.json({ count: null, unavailable: true, ...(process.env.NODE_ENV !== "production" && { hint, detail: err.message }) });
}

export async function POST() {
  const db = getAdmin();
  if (!db) return NextResponse.json({ count: null, unavailable: true });
  const { data, error } = await db.rpc("increment_site_stat", { stat_key: "visits" });
  if (error) return quiet("post", error);
  return NextResponse.json({ count: data });
}

export async function GET() {
  const db = getAdmin();
  if (!db) return NextResponse.json({ count: null, unavailable: true });
  const { data, error } = await db.from("site_stats").select("count").eq("key", "visits").maybeSingle();
  if (error) return quiet("get", error);
  return NextResponse.json({ count: data?.count ?? 0 });
}

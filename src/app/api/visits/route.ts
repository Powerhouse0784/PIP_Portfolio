import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const db = getAdmin();
  if (!db) return NextResponse.json({ error: "Counter unavailable" }, { status: 503 });
  const { data, error } = await db.rpc("increment_site_stat", { stat_key: "visits" });
  if (error) return NextResponse.json({ error: "Counter unavailable" }, { status: 500 });
  return NextResponse.json({ count: data });
}

export async function GET() {
  const db = getAdmin();
  if (!db) return NextResponse.json({ error: "Counter unavailable" }, { status: 503 });
  const { data, error } = await db.from("site_stats").select("count").eq("key", "visits").single();
  if (error) return NextResponse.json({ error: "Counter unavailable" }, { status: 500 });
  return NextResponse.json({ count: data.count });
}

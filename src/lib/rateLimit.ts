import { createHash } from "node:crypto";

/**
 * Durable rate limiting for the guestbook.
 * - With UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN: shared across all Vercel instances.
 * - Without them: falls back to a per-instance Map (fine locally, weak in production).
 * Limits: one note per COOLDOWN seconds, MAX_PER_HOUR per visitor. IPs are salted and hashed, never stored raw.
 */
const COOLDOWN = 20;
const MAX_PER_HOUR = 5;

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;
export const durableLimiter = Boolean(url && token);

const mem = new Map<string, { last: number; hits: number[] }>();

export const visitorKey = (req: Request) => {
  const ip = req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
  return createHash("sha256").update(`${process.env.RATE_LIMIT_SALT ?? "pip"}:${ip}`).digest("hex").slice(0, 32);
};

export type Verdict = { ok: true } | { ok: false; reason: "cooldown" | "hourly" };

async function upstash(commands: (string | number)[][]) {
  const res = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
    signal: AbortSignal.timeout(2500),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`upstash ${res.status}`);
  return (await res.json()) as { result: unknown }[];
}

export async function checkLimit(key: string): Promise<Verdict> {
  if (durableLimiter) {
    try {
      const [cool, hits] = await upstash([
        ["SET", `gb:cool:${key}`, "1", "EX", COOLDOWN, "NX"],
        ["INCR", `gb:hour:${key}`],
        ["EXPIRE", `gb:hour:${key}`, 3600, "NX"],
      ]);
      if (cool.result !== "OK") return { ok: false, reason: "cooldown" };
      if (Number(hits.result) > MAX_PER_HOUR) return { ok: false, reason: "hourly" };
      return { ok: true };
    } catch (e) {
      console.error("[guestbook] limiter unavailable, falling back to memory:", e);
    }
  }
  const now = Date.now();
  const s = mem.get(key) ?? { last: 0, hits: [] };
  s.hits = s.hits.filter((t) => now - t < 3_600_000);
  if (now - s.last < COOLDOWN * 1000) return { ok: false, reason: "cooldown" };
  if (s.hits.length >= MAX_PER_HOUR) return { ok: false, reason: "hourly" };
  s.last = now; s.hits.push(now); mem.set(key, s);
  if (mem.size > 5000) mem.clear();
  return { ok: true };
}

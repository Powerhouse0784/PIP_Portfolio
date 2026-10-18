import { createHash } from "node:crypto";

/**
 * Durable rate limiting shared by the guestbook and the AI routes.
 * - With UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN: shared across all Vercel instances.
 * - Without them: falls back to a per-instance Map (fine locally, weak in production).
 * IPs are salted and hashed, never stored raw.
 */
const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;
export const durableLimiter = Boolean(url && token);

export type Policy = { name: string; cooldown: number; perHour: number };
export const GUESTBOOK: Policy = { name: "gb", cooldown: 20, perHour: 5 };
export const CHAT: Policy = { name: "chat", cooldown: 2, perHour: 40 };
export const DREAM: Policy = { name: "dream", cooldown: 6, perHour: 12 };
export const DAILY: Policy = { name: "daily", cooldown: 8, perHour: 6 };
export const REACT: Policy = { name: "react", cooldown: 1, perHour: 120 };
/** Counted only when a moderation login fails, so real moderators are never slowed down. */
export const ADMIN_FAIL: Policy = { name: "admfail", cooldown: 1, perHour: 10 };

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

export async function checkLimit(key: string, policy: Policy = GUESTBOOK): Promise<Verdict> {
  const { name, cooldown, perHour } = policy;
  if (durableLimiter) {
    try {
      const [cool, hits] = await upstash([
        ["SET", `${name}:cool:${key}`, "1", "EX", cooldown, "NX"],
        ["INCR", `${name}:hour:${key}`],
        ["EXPIRE", `${name}:hour:${key}`, 3600, "NX"],
      ]);
      if (cool.result !== "OK") return { ok: false, reason: "cooldown" };
      if (Number(hits.result) > perHour) return { ok: false, reason: "hourly" };
      return { ok: true };
    } catch (e) {
      console.error(`[${name}] limiter unavailable, falling back to memory:`, e);
    }
  }
  const mk = `${name}:${key}`;
  const now = Date.now();
  const s = mem.get(mk) ?? { last: 0, hits: [] };
  s.hits = s.hits.filter((t) => now - t < 3_600_000);
  if (now - s.last < cooldown * 1000) return { ok: false, reason: "cooldown" };
  if (s.hits.length >= perHour) return { ok: false, reason: "hourly" };
  s.last = now; s.hits.push(now); mem.set(mk, s);
  if (mem.size > 5000) mem.clear();
  return { ok: true };
}

/** Read-only: has this visitor used up a policy's hourly allowance? (Does not count as an attempt.) */
export async function lockedOut(key: string, policy: Policy): Promise<boolean> {
  const { name, perHour } = policy;
  if (durableLimiter) {
    try {
      const [r] = await upstash([["GET", `${name}:hour:${key}`]]);
      return Number(r.result ?? 0) >= perHour;
    } catch (e) {
      console.error(`[${name}] limiter unavailable, falling back to memory:`, e);
    }
  }
  const s = mem.get(`${name}:${key}`);
  if (!s) return false;
  const now = Date.now();
  return s.hits.filter((t) => now - t < 3_600_000).length >= perHour;
}

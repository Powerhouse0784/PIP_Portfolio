import { createHash, timingSafeEqual } from "node:crypto";

/** Moderation is off until GUESTBOOK_ADMIN_TOKEN is set to something long and random (16+ characters). */
export const adminConfigured = () => (process.env.GUESTBOOK_ADMIN_TOKEN ?? "").length >= 16;

/** Constant-time check of "Authorization: Bearer <token>". The token is never accepted from a URL or query string. */
export function checkAdmin(req: Request): boolean {
  const token = process.env.GUESTBOOK_ADMIN_TOKEN ?? "";
  if (token.length < 16) return false;
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(token).digest();
  return timingSafeEqual(a, b);
}

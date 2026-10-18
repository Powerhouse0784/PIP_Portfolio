import { test, expect } from "@playwright/test";
import { moonPhase, litPath, greeting, dayPart, feelingForMoon, localDay } from "../src/lib/sky";
import { inferFeel, isFeel, FEEL_LIST } from "../src/lib/feel";
import { checkAdmin, adminConfigured } from "../src/lib/adminAuth";

// Pure logic only: runs in milliseconds, needs no browser and no server.
test.describe("pure helpers", () => {
  test("moon phase follows the real sky", () => {
    expect(moonPhase(new Date("2026-10-10T15:50:00Z")).lit).toBeLessThan(0.05);
    const full = moonPhase(new Date("2026-10-26T04:00:00Z"));
    expect(full.lit).toBeGreaterThan(0.95);
    expect(full.name).toBe("Full Moon");
    expect(full.next).toMatch(/Full moon tonight|New moon in/);
    const mid = moonPhase(new Date("2026-10-18T20:00:00Z"));
    expect(mid.phase).toBeGreaterThan(0.18);
    expect(mid.phase).toBeLessThan(0.35); // waxing, around first quarter
  });
  test("moon drawing: nothing when new, a full disc when full, and lit side flips when waning", () => {
    expect(litPath(0.001, 20)).toBe("");
    expect(litPath(0.5, 20)).toContain("A20 20 0 1 1");
    expect(litPath(0.1, 20)).not.toBe(litPath(0.9, 20));
  });
  test("time-of-day greeting", () => {
    expect(dayPart(new Date(2026, 9, 18, 8))).toBe("morning");
    expect(dayPart(new Date(2026, 9, 18, 14))).toBe("afternoon");
    expect(dayPart(new Date(2026, 9, 18, 19))).toBe("evening");
    expect(dayPart(new Date(2026, 9, 18, 23))).toBe("night");
    expect(dayPart(new Date(2026, 9, 18, 3))).toBe("night");
    expect(greeting(new Date(2026, 9, 18, 23))).toMatch(/Midnight Nursery/);
    expect(localDay(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(feelingForMoon("Waxing Crescent")).toBe("brave");
    expect(feelingForMoon("Full Moon")).toBe("floaty");
  });
  test("Pip's feelings: tags are whitelisted and words are read when there is no tag", () => {
    expect(FEEL_LIST.every(isFeel)).toBe(true);
    expect(isFeel("furious")).toBe(false);
    expect(inferFeel("*giggle* hehe!")).toBe("giggly");
    expect(inferFeel("*yawn* so sleepy")).toBe("sleepy");
    expect(inferFeel("I design dreams and lullabies")).toBe("proud");
    expect(inferFeel("Hmm, what do you think?")).toBe("curious");
    expect(inferFeel("Hello there!")).toBe("happy");
  });
  test("admin token check is strict and constant-time", () => {
    const old = process.env.GUESTBOOK_ADMIN_TOKEN;
    try {
      process.env.GUESTBOOK_ADMIN_TOKEN = "short";
      expect(adminConfigured()).toBe(false);
      expect(checkAdmin(new Request("http://x", { headers: { Authorization: "Bearer short" } }))).toBe(false);
      process.env.GUESTBOOK_ADMIN_TOKEN = "a-long-random-token-1234";
      expect(adminConfigured()).toBe(true);
      expect(checkAdmin(new Request("http://x", { headers: { Authorization: "Bearer a-long-random-token-1234" } }))).toBe(true);
      expect(checkAdmin(new Request("http://x", { headers: { Authorization: "Bearer a-long-random-token-0000" } }))).toBe(false);
      expect(checkAdmin(new Request("http://x?token=a-long-random-token-1234"))).toBe(false);
    } finally { if (old === undefined) delete process.env.GUESTBOOK_ADMIN_TOKEN; else process.env.GUESTBOOK_ADMIN_TOKEN = old; }
  });
});


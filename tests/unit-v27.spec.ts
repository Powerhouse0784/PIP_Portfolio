import { test, expect } from "@playwright/test";
import { fade, interpolate, MAX_SPARKS, PALETTE_DAY, spawn, sparksFor, step } from "../src/lib/trail";
import { chaosFor, stickerAt, STICKER_POOL, tierFor } from "../src/lib/chaos";

// Pure logic: runs in milliseconds, needs no browser or server.
const seeded = (seed = 7) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

test.describe("sparkle trail maths", () => {
  test("slow drifts are quiet, fast sweeps shower, and it never floods", () => {
    expect(sparksFor(0)).toBe(0);
    expect(sparksFor(4.9)).toBe(0);
    expect(sparksFor(10)).toBeGreaterThanOrEqual(1);
    expect(sparksFor(400)).toBeLessThanOrEqual(5);
    expect(sparksFor(60, 2)).toBeGreaterThan(sparksFor(60, 1));
    expect(MAX_SPARKS).toBeLessThanOrEqual(120);
  });
  test("a fast flick leaves no holes: points are spread along the move and end at the pointer", () => {
    const pts = interpolate(0, 0, 300, 0, 20);
    expect(pts.length).toBe(10); // capped
    expect(pts[pts.length - 1]).toEqual([300, 0]);
    expect(interpolate(0, 0, 3, 4, 20)).toEqual([[3, 4]]);
  });
  test("sparks spawn with palette colours and valid kinds", () => {
    const list = spawn(100, 100, 40, PALETTE_DAY, seeded());
    expect(list).toHaveLength(40);
    for (const s of list) {
      expect(PALETTE_DAY).toContain(s.color);
      expect([0, 1, 2]).toContain(s.kind);
      expect(s.life).toBeGreaterThan(0.5);
      expect(Math.abs(s.x - 100)).toBeLessThan(5);
    }
    expect(new Set(list.map((s) => s.kind)).size).toBeGreaterThan(1);
  });
  test("sparks drift, fade out and are removed in place", () => {
    const list = spawn(0, 0, 10, PALETTE_DAY, seeded(3));
    const x0 = list[0].x;
    step(list, 0.1);
    expect(list.length).toBe(10);
    expect(list[0].x).not.toBe(x0);
    expect(fade(list[0])).toBeLessThan(1);
    step(list, 5); // everyone is past their life
    expect(list).toHaveLength(0);
  });
  test("fade goes from 1 to 0", () => {
    const [s] = spawn(0, 0, 1, PALETTE_DAY, seeded(9));
    expect(fade(s)).toBe(1);
    s.age = s.life;
    expect(fade(s)).toBe(0);
  });
});

test.describe("responsive chaos", () => {
  test("screen width picks the tier", () => {
    expect(tierFor(320)).toBe("pocket");
    expect(tierFor(390)).toBe("phone");
    expect(tierFor(768)).toBe("tablet");
    expect(tierFor(1024)).toBe("laptop");
    expect(tierFor(1440)).toBe("desktop");
    expect(tierFor(1920)).toBe("cinema");
  });
  test("bigger screens get bigger tilts and more columns, and every size is bounded", () => {
    const sizes: [number, number][] = [[320, 568], [390, 844], [768, 1024], [1100, 800], [1440, 900], [1920, 1080]];
    const c = sizes.map(([w, h]) => chaosFor(w, h));
    for (let i = 1; i < c.length; i++) {
      expect(c[i].tilt).toBeGreaterThan(c[i - 1].tilt);
      expect(c[i].shift).toBeGreaterThan(c[i - 1].shift);
      expect(c[i].cols).toBeGreaterThanOrEqual(c[i - 1].cols);
      expect(c[i].stickers).toBeGreaterThanOrEqual(c[i - 1].stickers);
    }
    for (const x of c) { expect(x.tilt).toBeLessThanOrEqual(3.5); expect(x.stickers).toBeGreaterThanOrEqual(6); expect(x.stickers).toBeLessThanOrEqual(STICKER_POOL); }
    expect(c[0].border).toBe("dotted");
    expect(c[5].border).toBe("groove");
    expect(c[0].cols).toBe(1);
  });
  test("orientation is reported", () => {
    expect(chaosFor(390, 844).portrait).toBe(true);
    expect(chaosFor(844, 390).portrait).toBe(false);
  });
  test("sticker positions are deterministic and stay on screen", () => {
    for (let i = 0; i < STICKER_POOL; i++) {
      const a = stickerAt(i), b = stickerAt(i);
      expect(a).toEqual(b);
      expect(a.x).toBeGreaterThanOrEqual(0); expect(a.x).toBeLessThanOrEqual(100);
      expect(a.y).toBeGreaterThanOrEqual(0); expect(a.y).toBeLessThanOrEqual(100);
    }
    expect(stickerAt(0)).not.toEqual(stickerAt(1));
  });
});

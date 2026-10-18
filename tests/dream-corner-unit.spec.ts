import { test, expect } from "@playwright/test";
import { OUTFITS } from "../src/lib/outfits";
import { STORIES } from "../src/lib/stories";
import { ACT_LIST, ACT_LINES, ACT_FX, ACT_MS, ACT_MOOD, parseCommand } from "../src/lib/pipAct";

test.describe("dream corner libs", () => {
  test("outfits: original is empty, every other piece has artwork", () => {
    expect(OUTFITS[0]).toMatchObject({ id: "none", svg: "" });
    for (const o of OUTFITS.slice(1)) expect(o.svg).toContain("<");
  });
  test("offline stories: three non-empty pages each", () => {
    for (const s of STORIES) { expect(s.title.length).toBeGreaterThan(3); expect(s.pages).toHaveLength(3); s.pages.forEach((p) => expect(p.length).toBeGreaterThan(60)); }
  });
  test("every move has words, sparks, duration and a mood", () => {
    for (const a of ACT_LIST) { expect(ACT_LINES[a].length).toBeGreaterThan(0); expect(ACT_FX[a].length).toBeGreaterThan(0); expect(ACT_MS[a]).toBeGreaterThan(500); expect(ACT_MOOD[a]).toBeTruthy(); }
  });
  test("command parser maps plain words to moves", () => {
    expect(parseCommand("Pip, dance!")).toBe("dance");
    expect(parseCommand("can you spin around")).toBe("spin");
    expect(parseCommand("what is your name")).toBeNull();
  });
});

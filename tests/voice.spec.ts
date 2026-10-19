import { test, expect } from "@playwright/test";
import { createSpeaker, listen } from "../src/lib/pipVoice";

/** These run in Node with a fake speech engine: no browser, no network, no microphone. */
type G = Record<string, unknown>;
const g = globalThis as unknown as G;

function fakeSpeech() {
  const spoken: string[] = [];
  g.window = { dispatchEvent: () => true };
  g.CustomEvent = class { type: string; detail: unknown; constructor(t: string, o?: { detail?: unknown }) { this.type = t; this.detail = o?.detail; } };
  Object.defineProperty(globalThis, "navigator", { value: { language: "en-IN" }, configurable: true, writable: true }); // Node 21+ ships a getter-only navigator, so plain assignment throws
  g.speechSynthesis = {
    cancel() { spoken.length = 0; }, resume() {}, getVoices: () => [{ name: "Samantha", lang: "en-US" }],
    speak(u: { text: string; onstart?: () => void }) { spoken.push(u.text); setTimeout(() => u.onstart?.(), 0); },
  };
  g.SpeechSynthesisUtterance = class { text: string; constructor(t: string) { this.text = t; } };
  return spoken;
}

test("Pip speaks each sentence the moment it is written, not after the whole reply", () => {
  const spoken = fakeSpeech();
  const sp = createSpeaker("happy");
  const chunks = ["Hi", " there, litt", "le dreamer! ", "I just *gigg", "led* and ", "{mood:happy} I ", "love lullabies. Wan", "na hear a story about the sleepy moon and ", "the tiny star", "?"];
  let text = "";
  const firstSpokenAt: number[] = [];
  chunks.forEach((c, i) => { text += c; sp.push(text); if (spoken.length && !firstSpokenAt.length) firstSpokenAt.push(i); });
  // The first sentence is spoken while the reply is still streaming (chunk 2 of 10), not at the end.
  expect(firstSpokenAt[0]).toBeLessThan(chunks.length - 1);
  expect(spoken[0]).toBe("Hi there, little dreamer!");
  sp.finish(text);
  const all = spoken.join(" ");
  expect(all).not.toMatch(/[*{}]/); // actions and tags are never read aloud
  expect(all.endsWith("the tiny star?")).toBe(true);
  expect(new Set(spoken).size).toBe(spoken.length); // nothing is said twice
});

test("a long first sentence starts at a comma instead of waiting for the full stop", () => {
  const spoken = fakeSpeech();
  const sp = createSpeaker("happy");
  sp.push("Once upon a very sleepy night, a tiny star tumbled out of the sky and landed in a cloud of warm pillows");
  expect(spoken.length).toBe(1);
  expect(spoken[0].startsWith("Once upon a very sleepy night,")).toBe(true);
});

test("microphone errors say what actually went wrong, and the language retry is silent", async () => {
  fakeSpeech();
  const made: { lang: string; fail?: string }[] = [];
  class FakeRec {
    lang = ""; interimResults = false; continuous = false; maxAlternatives = 1;
    onresult: unknown = null; onerror: ((e: { error: string }) => void) | null = null; onend: (() => void) | null = null;
    constructor() { made.push(this as never); }
    start() { const me = made[made.length - 1] as { lang: string; fail?: string }; me.lang = this.lang; setTimeout(() => { if (me.fail) this.onerror?.({ error: me.fail }); }, 0); }
    stop() {} abort() {}
  }
  (g.window as G).webkitSpeechRecognition = FakeRec;

  const run = (fail: string) => new Promise<string[]>((resolve) => {
    made.length = 0;
    const errors: string[] = [];
    const orig = FakeRec.prototype.start;
    FakeRec.prototype.start = function (this: FakeRec) { (this as unknown as { fail?: string }).fail = fail; return orig.call(this); };
    listen({ onText: () => {}, onFinal: () => {}, onError: (m) => errors.push(m), onEnd: () => {} });
    setTimeout(() => { FakeRec.prototype.start = orig; resolve(errors); }, 40);
  });

  expect((await run("network"))[0]).toContain("can’t reach the speech service");
  expect((await run("audio-capture"))[0]).toContain("working microphone");
  expect((await run("not-allowed"))[0]).toContain("blocked");
  expect(await run("aborted")).toEqual([]); // we stopped it ourselves: no scary message
});

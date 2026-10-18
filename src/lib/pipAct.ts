import { feel, type Feel } from "./feel";

/** Things Pip can physically do when asked. The hero animates them in CSS (see data-act in globals.css). */
export const ACT_LIST = ["dance", "spin", "jump", "wave", "sleep", "sing", "clap", "hide", "laugh", "bow", "fly", "love", "wink", "surprise"] as const;
export type Act = (typeof ACT_LIST)[number];
export const isAct = (v: unknown): v is Act => typeof v === "string" && (ACT_LIST as readonly string[]).includes(v);

export const ACT_MOOD: Record<Act, Feel> = {
  dance: "giggly", spin: "giggly", jump: "happy", wave: "happy", sleep: "sleepy", sing: "happy", clap: "proud",
  hide: "shy", laugh: "giggly", bow: "proud", fly: "happy", love: "shy", wink: "giggly", surprise: "curious",
};
export const ACT_MS: Record<Act, number> = {
  dance: 3600, spin: 1500, jump: 2000, wave: 1800, sleep: 3600, sing: 5200, clap: 1900, hide: 3000, laugh: 1500, bow: 2200, fly: 3000, love: 2200, wink: 1700, surprise: 1000,
};
export const ACT_FX: Record<Act, string[]> = {
  dance: ["♪", "♫", "✦"], spin: ["✦", "✧"], jump: ["✦", "!"], wave: ["👋", "✦"], sleep: ["z", "Z"], sing: ["♪", "♫", "♬"], clap: ["✦", "★"],
  hide: ["?", "·"], laugh: ["♡", "✿"], bow: ["★", "✦"], fly: ["✦", "✧", "☁"], love: ["♡", "♥"], wink: ["✦"], surprise: ["!", "?", "✦"],
};
/** Pip's own words when no AI is available, so commands still feel alive offline. */
export const ACT_LINES: Record<Act, string[]> = {
  dance: ["*dances* Wheee! Watch my nightcap bounce!", "Boogie, boogie, sleepy boogie!", "*wiggles* I can dance even when I’m yawning!"],
  spin: ["*spins* Whoa… the nursery is spinning too!", "Twirl, twirl, twirl! I’m a little star!"],
  jump: ["*hops* Boing! Boing! Boing!", "Up, up, and down again! Hehe!"],
  wave: ["*waves* Hello, hello! Goodnight and good morning!", "Hi hi hi! *waves with my whole self*"],
  sleep: ["*yawn* Okay… just a tiny nap… zzz…", "Mmm… soft pillow… goodnight…"],
  sing: ["*hums* La la lullaby, the moon is up so high…", "Hmm hmm hmm… that’s my favourite one."],
  clap: ["*claps* Hooray! Hooray!", "Clap clap clap! That deserves a star!"],
  hide: ["*hides* Where did Pip go? Peek-a-boo!", "Shhh… I’m behind the cloud!"],
  laugh: ["*giggles* Hehehe! Stop, you’re tickling my nightcap!", "Hahaha! My tummy wiggles when I laugh!"],
  bow: ["*bows* Thank you, thank you! Pip is honoured.", "*tips nightcap* Much obliged!"],
  fly: ["*floats up* Look! I’m a little cloud!", "Wheee, I’m floating! Don’t let go of the string!"],
  love: ["*blushes* Aww… I love you too, sleepyhead.", "*hugs the moon* You’re so kind!"],
  wink: ["*winks* ✦ Our little secret.", "Hehe, did you see that? I winked!"],
  surprise: ["Oh! *eyes go wide* You surprised me!", "Gasp! I did not see that coming!"],
};

/** Free, instant, offline: read the command from the words so Pip moves before the AI even answers. */
const INTENTS: [RegExp, Act][] = [
  [/\b(danc(e|es|ing)|boogie|groove|shake it)\b/, "dance"],
  [/\b(spin|twirl|turn around|rotate|go round)\b/, "spin"],
  [/\b(jump|hop|bounce|leap)\b/, "jump"],
  [/\b(wave|say hi|say hello|goodbye|bye)\b/, "wave"],
  [/\b(sleep|nap|bedtime|good ?night|lie down|go to bed|rest)\b/, "sleep"],
  [/\b(sing|hum|lullaby|song)\b/, "sing"],
  [/\b(clap|applause|cheer)\b/, "clap"],
  [/\b(hide|peek|disappear)\b/, "hide"],
  [/\b(laugh|giggle|joke|funny)\b/, "laugh"],
  [/\b(bow|take a bow|thank you|thanks)\b/, "bow"],
  [/\b(fly|float|levitate)\b/, "fly"],
  [/\b(love|hug|heart|kiss)\b/, "love"],
  [/\b(wink|blink)\b/, "wink"],
  [/\b(surprise|wow|gasp)\b/, "surprise"],
];
export const parseCommand = (text: string): Act | null => {
  const t = text.toLowerCase();
  for (const [re, a] of INTENTS) if (re.test(t)) return a;
  return null;
};

/** Make Pip do something now (hero listens for pip:act) and put the matching expression on his face. */
export const perform = (a: Act) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("pip:act", { detail: { act: a } }));
  feel(ACT_MOOD[a]);
};
/** Pip's head bobs while he talks. */
export const talking = (on: boolean) => {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("pip:talk", { detail: { on } }));
};

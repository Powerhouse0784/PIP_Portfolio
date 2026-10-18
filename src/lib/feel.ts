/** Pip's expressions. The chat (AI or rule book) picks one; the hero art reacts with eyes, blush and sparkles. */
export const FEEL_LIST = ["happy", "sleepy", "giggly", "curious", "proud", "shy"] as const;
export type Feel = (typeof FEEL_LIST)[number];

export const FEELS: Record<Feel, { emoji: string; label: string; sparks: string[] }> = {
  happy: { emoji: "😊", label: "happy", sparks: ["✦", "✧", "✦"] },
  sleepy: { emoji: "😴", label: "sleepy", sparks: ["z", "Z"] },
  giggly: { emoji: "🤭", label: "giggly", sparks: ["♡", "✿", "♡"] },
  curious: { emoji: "🤔", label: "curious", sparks: ["?", "✧"] },
  proud: { emoji: "🌟", label: "proud", sparks: ["★", "✦", "★"] },
  shy: { emoji: "🙈", label: "shy", sparks: ["♡", "·"] },
};

export const isFeel = (v: unknown): v is Feel => typeof v === "string" && (FEEL_LIST as readonly string[]).includes(v);

/** Fallback when a reply has no mood tag: read the room from the words. */
export function inferFeel(text: string): Feel {
  const t = text.toLowerCase();
  if (/\*?(giggle|giggles|hehe|haha|boop)\*?/.test(t)) return "giggly";
  if (/\*?yawn\*?|sleepy|zzz|nap|tired|close your eyes/.test(t)) return "sleepy";
  if (/proud|i (design|build|made|make)|my (projects|work)|tada/.test(t)) return "proud";
  if (/blush|nothing scary|my head is just|oh!|aw+/.test(t)) return "shy";
  if (/\?\s*$|hmm|wonder|too sleepy to understand/.test(t)) return "curious";
  return "happy";
}

export const feel = (mood: Feel) => {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("pip:feel", { detail: { mood } }));
};

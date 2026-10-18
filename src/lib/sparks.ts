/** Server-side "creative sparks" so Pip never sounds the same twice. Pools are fixed; nothing here comes from the visitor. */
const pick = <T,>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];

const THINGS = [
  "a teaspoon of starlight", "a sleepy snail carrying a lantern", "a staircase of soft clouds", "a mail-owl in slippers",
  "a jar of lullaby fireflies", "a hot-air balloon shaped like a pillow", "a hedgehog who hums", "a moon-shaped swing",
  "a teacup boat", "a quilt that tells gentle jokes", "a lighthouse made of bedtime stories", "a bunny in a tiny nightcap",
  "a music box that dreams back", "a whale made of warm fog", "a paper lantern parade", "a very polite comet",
];
const PLACES = ["above the rooftops", "inside a giant pillow", "beside a quiet pond of stars", "in a cloud-top library", "along a ribbon of moonlight", "in a hidden garden of nightlights"];
const TONES = ["whispery", "bouncy", "dreamy", "playful", "tender", "wondering", "gently silly"];
const MOVES = ["ask one tiny question back", "share one tiny Pip fact", "make a small sleepy joke", "mention something cozy about the nursery", "offer a one-line lullaby wish"];

export const dreamSpark = () => {
  const a = pick(THINGS);
  let b = pick(THINGS);
  while (b === a) b = pick(THINGS);
  return `For variety, softly include ${a} and ${b}, somewhere ${pick(PLACES)}. Tone: ${pick(TONES)}. Avoid the most obvious title and opening words; surprise the reader.`;
};

export const chatSpark = () =>
  `Make this reply feel fresh: lean ${pick(TONES)}, and ${pick(MOVES)}. Never repeat a phrase you already used earlier in this conversation.`;

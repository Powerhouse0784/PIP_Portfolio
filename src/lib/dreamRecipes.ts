/** Pip's recipe book: dreams that always work, even offline or with no API key. Pass a seed for a repeatable pick. */
export const FEELINGS = {
  cozy: {
    label: "Cozy", adj: "snuggly",
    places: ["a blanket fort built from warm clouds", "a tiny cabin where the fireplace hums", "a window seat above a snowy rooftop", "a hammock strung between two sleepy trees", "a bathtub boat floating on warm milk-colored mist", "a bookshop where every book purrs"],
    gifts: ["a cup of warm moonmilk", "a quilt stitched from sunsets", "a pair of slippers that hum lullabies", "a teapot that pours bedtime stories"],
    ends: ["wrapped up as snug as a sleeping kitten", "tucked in by a very gentle breeze", "warm from the nose to the toes", "smiling into the softest pillow"],
  },
  brave: {
    label: "Brave", adj: "bold",
    places: ["the tallest rooftop in Midnight Nursery", "a bridge made of rainbows", "the deck of a ship sailing the night sky", "a lighthouse at the edge of the clouds", "a mountain of marshmallow snow", "the start of a staircase to the moon"],
    gifts: ["a lantern that never goes out", "a tiny cape made of starlight", "a compass that always points home", "a trumpet that plays only kind songs"],
    ends: ["standing tall, with nothing left to fear", "marching home with a glowing grin", "brave enough to wave at the whole sky", "sure that every shadow is just a friend"],
  },
  floaty: {
    label: "Floaty", adj: "drifting",
    places: ["a cloud that drifts above the sleepy sea", "a sky full of slow, kind balloons", "a river of fog that flows uphill", "a swing that never quite lands", "a garden where the flowers float", "a dandelion the size of a house"],
    gifts: ["a pair of feather-light slippers", "a kite made of lullabies", "a bubble that holds one perfect thought", "a ribbon of drifting moonlight"],
    ends: ["floating gently toward the morning", "carried along by a hushed little breeze", "light as a sigh, soft as a cloud", "rocking slowly among the stars"],
  },
  giggly: {
    label: "Giggly", adj: "giggly",
    places: ["a meadow where the flowers tell jokes", "a playground made entirely of pillows", "a circus of sleepy penguins", "a lane where the puddles tickle your toes", "a kitchen where the spoons dance", "a trampoline made of clouds"],
    gifts: ["a jar of sparkling giggles", "a feather that tickles the moon", "a pair of socks that wiggle", "a hat that laughs when it is worn"],
    ends: ["giggling softly in their sleep", "laughing so hard the stars twinkle along", "snorting happily into a pillow", "dreaming of one more silly joke"],
  },
} as const;
export type Feeling = keyof typeof FEELINGS;
export type Dream = { title: string; text: string; ai: boolean };

const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

export function recipe(name: string, f: Feeling, seed?: string): Dream {
  const d = FEELINGS[f];
  const pick = <T,>(arr: readonly T[], salt: string): T =>
    seed ? arr[hash(`${seed}:${name}:${salt}`) % arr.length] : arr[Math.floor(Math.random() * arr.length)];
  const place = pick(d.places, "p"), gift = pick(d.gifts, "g"), end = pick(d.ends, "e");
  const frames = [
    () => `Tonight, ${name} drifts away to ${place}. A tiny star waves hello and hands over ${gift}. By the time the moon gives a big yawn, ${name} is ${end}.`,
    () => `When the nursery goes quiet, ${name} follows a trail of glimmers to ${place}. Waiting there is ${gift}, saved just for them. Soon ${name} is ${end}.`,
    () => `Pip tiptoes into ${name}’s night with ${gift}. Together they wander to ${place} and hum along. And just like that, ${name} is ${end}.`,
  ];
  const titles = [`${name}’s ${d.adj} dream`, `The ${d.adj} night of ${name}`, `${name} and the midnight ${d.adj === "giggly" ? "giggles" : "lantern"}`];
  return {
    ai: false,
    title: pick(titles, "t"),
    text: `${pick(frames, "f")()} Sweet dreams. — Pip ✦`,
  };
}

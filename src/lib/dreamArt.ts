/**
 * Procedural dream illustrations. Every dream (AI-written or from the recipe book) gets its own little night scene,
 * seeded from its text so the same dream always draws the same picture. No API, no images, nothing leaves the browser.
 * The result is a plain SVG string built only from numbers and fixed colours (never from visitor text), so it is safe to
 * use as an <img src="data:..."> and as a background for the canvas share card.
 */
export type ArtFeel = "cozy" | "brave" | "floaty" | "giggly";

type Pal = { sky: [string, string, string]; hills: [string, string, string]; glow: string; star: string; cloud: string; accent: string };
const PAL: Record<ArtFeel, Pal> = {
  cozy:   { sky: ["#3b2a52", "#8a4f6e", "#f0a58a"], hills: ["#5a3a62", "#432d57", "#2e2142"], glow: "#ffd9a0", star: "#ffe9b8", cloud: "#ffe0e6", accent: "#f2a65a" },
  brave:  { sky: ["#10143a", "#2c3f8a", "#e9a85a"], hills: ["#27336b", "#1b2552", "#101637"], glow: "#ffd36e", star: "#fff1c2", cloud: "#c9d6ff", accent: "#ffce5a" },
  floaty: { sky: ["#35306b", "#7f78c9", "#f2b9d6"], hills: ["#6a60b0", "#514a96", "#3a3478"], glow: "#fff0c9", star: "#ffffff", cloud: "#ffffff", accent: "#bfe9ff" },
  giggly: { sky: ["#4a2a6a", "#c0589a", "#ffc58f"], hills: ["#8a4a9a", "#6a3a86", "#4a2a64"], glow: "#fff0a8", star: "#fff6c8", cloud: "#ffe7f5", accent: "#8ff0cf" },
};

const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const rng = (seed: number) => () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const f = (n: number) => n.toFixed(1);

type Prop = "lantern" | "balloon" | "flower" | "rainbow" | "house" | "kite";
const KEYS: [Prop, RegExp][] = [
  ["lantern", /lantern|lamp|light|glim|fireplace|candle/i],
  ["balloon", /balloon|bubble|float|drift/i],
  ["flower", /flower|meadow|garden|clover|dandelion|bloom/i],
  ["rainbow", /rainbow|bridge|stair/i],
  ["house", /cabin|window|rooftop|bookshop|kitchen|fort|lighthouse|nursery|home/i],
  ["kite", /kite|ribbon|feather|breeze|wind/i],
];
const FALLBACK: Record<ArtFeel, Prop[]> = { cozy: ["lantern", "house"], brave: ["rainbow", "lantern"], floaty: ["balloon", "kite"], giggly: ["flower", "balloon"] };

function pickProps(text: string, feeling: ArtFeel, r: () => number): Prop[] {
  const found = KEYS.filter(([, re]) => re.test(text)).map(([p]) => p);
  const out = [...new Set([...found, ...FALLBACK[feeling]])];
  // deterministic shuffle so the same dream always picks the same three
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out.slice(0, 3);
}

function hill(r: () => number, base: number, amp: number, fill: string, op = 1): string {
  const a = r() * 6, b = 0.012 + r() * 0.01, c = r() * 6;
  let d = `M0 500 L0 ${f(base)}`;
  for (let x = 0; x <= 400; x += 20) d += ` L${x} ${f(base + Math.sin(x * b + a) * amp + Math.sin(x * b * 2.3 + c) * amp * 0.4)}`;
  return `<path d="${d} L400 500Z" fill="${fill}" opacity="${op}"/>`;
}

function cloud(x: number, y: number, s: number, fill: string, op: number, cls: string, delay: number) {
  return `<g class="${cls}" style="animation-delay:-${f(delay)}s" opacity="${op}" transform="translate(${f(x)} ${f(y)}) scale(${f(s)})" fill="${fill}"><rect x="0" y="20" width="110" height="24" rx="12"/><circle cx="34" cy="22" r="20"/><circle cx="62" cy="16" r="24"/><circle cx="88" cy="26" r="15"/></g>`;
}

function lantern(x: number, y: number, p: Pal, delay: number) {
  return `<g class="sw" style="animation-delay:-${f(delay)}s;transform-origin:${f(x)}px ${f(y - 40)}px"><line x1="${f(x)}" y1="${f(y - 40)}" x2="${f(x)}" y2="${f(y - 14)}" stroke="#d8c0a0" stroke-width="1.5"/><circle cx="${f(x)}" cy="${f(y)}" r="34" fill="url(#gl)" opacity=".75"/><rect x="${f(x - 10)}" y="${f(y - 14)}" width="20" height="26" rx="8" fill="${p.glow}"/><rect x="${f(x - 7)}" y="${f(y - 18)}" width="14" height="6" rx="3" fill="#c9a272"/><rect x="${f(x - 6)}" y="${f(y + 10)}" width="12" height="5" rx="2.5" fill="#c9a272"/></g>`;
}
function balloon(x: number, y: number, fill: string, delay: number) {
  return `<g class="fl" style="animation-delay:-${f(delay)}s"><path d="M${f(x)} ${f(y + 24)} Q${f(x + 6)} ${f(y + 50)} ${f(x - 2)} ${f(y + 78)}" fill="none" stroke="#ffffffaa" stroke-width="1.2"/><ellipse cx="${f(x)}" cy="${f(y)}" rx="15" ry="19" fill="${fill}"/><path d="M${f(x - 3)} ${f(y + 19)}l3 6 3-6z" fill="${fill}"/><ellipse cx="${f(x - 5)}" cy="${f(y - 6)}" rx="3.4" ry="5.5" fill="#fff" opacity=".45"/></g>`;
}
function kite(x: number, y: number, fill: string, delay: number) {
  return `<g class="fl" style="animation-delay:-${f(delay)}s"><path d="M${f(x)} ${f(y - 22)} L${f(x + 16)} ${f(y)} L${f(x)} ${f(y + 26)} L${f(x - 16)} ${f(y)}Z" fill="${fill}"/><path d="M${f(x)} ${f(y - 22)} V${f(y + 26)} M${f(x - 16)} ${f(y)} H${f(x + 16)}" stroke="#ffffff88" stroke-width="1"/><path d="M${f(x)} ${f(y + 26)} q-14 14 -4 30 t-6 34" fill="none" stroke="#ffffffaa" stroke-width="1.2"/></g>`;
}
function flowers(x: number, y: number, p: Pal, r: () => number) {
  const cols = [p.accent, "#ffd1e6", "#fff2a8", "#ffffff"];
  let out = "";
  for (let i = 0; i < 4; i++) {
    const fx = x + i * 16 + r() * 6, fy = y + r() * 8, c = cols[i % cols.length];
    out += `<g class="sw" style="animation-delay:-${f(i * 0.7)}s;transform-origin:${f(fx)}px ${f(fy + 22)}px"><line x1="${f(fx)}" y1="${f(fy)}" x2="${f(fx)}" y2="${f(fy + 22)}" stroke="#7fd4a0" stroke-width="2"/><circle cx="${f(fx)}" cy="${f(fy)}" r="6.5" fill="${c}"/><circle cx="${f(fx)}" cy="${f(fy)}" r="2.6" fill="#ffb347"/></g>`;
  }
  return out;
}
function rainbow(cx: number, cy: number) {
  const cols = ["#ff8fa3", "#ffc27a", "#fff08a", "#9be8b0", "#8fd0ff", "#c3a6ff"];
  return `<g opacity=".8" fill="none" stroke-width="7" stroke-linecap="round">${cols.map((c, i) => `<path d="M${f(cx - 96 + i * 7)} ${f(cy)} A${96 - i * 7} ${96 - i * 7} 0 0 1 ${f(cx + 96 - i * 7)} ${f(cy)}" stroke="${c}"/>`).join("")}</g>`;
}
function house(x: number, y: number, p: Pal) {
  return `<g><path d="M${f(x)} ${f(y)} h44 v-30 l-22 -22 l-22 22z" fill="#2a1f3f"/><rect x="${f(x + 14)}" y="${f(y - 24)}" width="14" height="14" rx="3" fill="${p.glow}"/><circle cx="${f(x + 21)}" cy="${f(y - 17)}" r="18" fill="url(#gl)" opacity=".6"/><rect x="${f(x + 32)}" y="${f(y - 46)}" width="6" height="14" fill="#2a1f3f"/></g>`;
}

export function dreamArtSvg(seed: string, feeling: ArtFeel, text = ""): string {
  const p = PAL[feeling];
  const r = rng(hash(`${seed}|${feeling}`));
  const props = pickProps(`${seed} ${text}`, feeling, r);

  let stars = "";
  for (let i = 0; i < 46; i++) {
    const big = r() < 0.18;
    stars += `<circle class="tw" style="animation-delay:-${f(r() * 4)}s" cx="${f(r() * 400)}" cy="${f(r() * 300)}" r="${big ? f(1.8 + r() * 1.2) : f(0.6 + r() * 0.9)}" fill="${p.star}" opacity="${f(0.45 + r() * 0.5)}"/>`;
  }
  const mx = 70 + r() * 260, mr = 26 + r() * 10;
  const moon = `<circle cx="${f(mx)}" cy="120" r="${f(mr * 2.4)}" fill="url(#gl)" opacity=".55"/><path d="M${f(mx)} ${f(120 - mr)} A${f(mr)} ${f(mr)} 0 1 0 ${f(mx)} ${f(120 + mr)} A${f(mr * 1.35)} ${f(mr * 1.35)} 0 0 1 ${f(mx)} ${f(120 - mr)}Z" fill="${p.glow}"/>`;

  const clouds = [
    cloud(-30 + r() * 80, 150 + r() * 20, 0.9 + r() * 0.4, p.cloud, 0.28, "dr a", r() * 30),
    cloud(210 + r() * 100, 205 + r() * 25, 0.7 + r() * 0.4, p.cloud, 0.38, "dr b", r() * 30),
    cloud(60 + r() * 120, 255 + r() * 20, 1 + r() * 0.5, p.cloud, 0.5, "dr c", r() * 30),
  ].join("");

  const h1 = 330 + r() * 12, h2 = 372 + r() * 12, h3 = 420 + r() * 10;
  const hills = hill(r, h1, 14, p.hills[0]) + hill(r, h2, 16, p.hills[1]) + hill(r, h3, 12, p.hills[2]);

  let objs = "";
  props.forEach((pr, i) => {
    const slot = i / 3;                        // spread the three props across the width
    const x = 40 + slot * 120 + r() * 70;
    const d = r() * 6;
    if (pr === "lantern") objs += lantern(x, 170 + r() * 60, p, d);
    else if (pr === "balloon") objs += balloon(x, 190 + r() * 70, [p.accent, "#ff9ec4", "#a8c8ff"][i % 3], d) + balloon(x + 24, 230 + r() * 40, "#ffe08a", d + 1.3);
    else if (pr === "kite") objs += kite(x, 200 + r() * 50, [p.accent, "#ff9ec4"][i % 2], d);
    else if (pr === "flower") objs += flowers(x - 10, h2 + 2, p, r);
    else if (pr === "rainbow") objs += rainbow(x + 40, h1 + 10);
    else if (pr === "house") objs += house(Math.min(x, 330), h1 + 22, p);
  });

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" width="400" height="500" preserveAspectRatio="xMidYMid slice">`,
    `<style>.tw{animation:tw 3.4s ease-in-out infinite alternate}.dr{animation:dr 38s ease-in-out infinite alternate}.dr.b{animation-duration:52s}.dr.c{animation-duration:64s}.sw{animation:sw 5s ease-in-out infinite alternate}.fl{animation:fl 6.5s ease-in-out infinite alternate}`,
    `@keyframes tw{from{opacity:.25}to{opacity:1}}@keyframes dr{from{translate:-14px 0}to{translate:30px 0}}@keyframes sw{from{rotate:-3deg}to{rotate:3deg}}@keyframes fl{from{translate:0 -5px}to{translate:0 7px}}`,
    `@media (prefers-reduced-motion:reduce){*{animation:none!important}}</style>`,
    `<defs><linearGradient id="sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.sky[0]}"/><stop offset=".55" stop-color="${p.sky[1]}"/><stop offset="1" stop-color="${p.sky[2]}"/></linearGradient>`,
    `<radialGradient id="gl"><stop offset="0" stop-color="${p.glow}" stop-opacity=".95"/><stop offset="1" stop-color="${p.glow}" stop-opacity="0"/></radialGradient></defs>`,
    `<rect width="400" height="500" fill="url(#sk)"/>${stars}${moon}${clouds}${hills}${objs}</svg>`,
  ].join("");
}

export const dreamArtSrc = (seed: string, feeling: ArtFeel, text = "") =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(dreamArtSvg(seed, feeling, text))}`;

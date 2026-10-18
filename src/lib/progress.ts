/**
 * Pip's progress: stickers, night streak and the days you visited. Stored in this browser only (localStorage).
 * A tiny external store: any component can call unlock("id"), any component can subscribe with useProgress().
 */
export type Sticker = { id: string; icon: string; name: string; hint: string };

export const STICKERS: Sticker[] = [
  { id: "giggle", icon: "😊", name: "First Giggle", hint: "Poke Pip." },
  { id: "wake", icon: "🥱", name: "Sleepyhead", hint: "Switch to night mode, then wake Pip up." },
  { id: "night", icon: "🌙", name: "Lights Out", hint: "Switch to night mode." },
  { id: "lullaby", icon: "🎵", name: "Lullaby Lab", hint: "Play a lullaby." },
  { id: "lantern", icon: "🏮", name: "Nightlight", hint: "Light a lantern." },
  { id: "route", icon: "🏠", name: "Rooftop Courier", hint: "Deliver a dream on the route." },
  { id: "storybook", icon: "📖", name: "Story Time", hint: "Read the storybook to the last page." },
  { id: "tower", icon: "🧱", name: "Tiny Tower", hint: "Stack 5 blocks." },
  { id: "rattle", icon: "🪇", name: "Rattle Star", hint: "Shake the rattle until a star pops out." },
  { id: "growth", icon: "📏", name: "Growing Up", hint: "Tap a mark on the growth chart." },
  { id: "catcher", icon: "⭐", name: "Dream Catcher", hint: "Score 10 in the falling-dreams game." },
  { id: "darkroom", icon: "🔦", name: "Flashlight Friend", hint: "Shine the light around the Dark Room." },
  { id: "mobile3d", icon: "🔔", name: "Star Ringer", hint: "Ring a star on the 3D dream mobile." },
  { id: "dream", icon: "💭", name: "Dream Maker", hint: "Build a dream in Pip’s special order." },
  { id: "daily", icon: "💌", name: "Daily Dreamer", hint: "Open tonight’s dream card." },
  { id: "corner", icon: "🎪", name: "Corner Kid", hint: "Try an activity in the Dream Corner." },
  { id: "photo", icon: "📷", name: "Say Cheese", hint: "Take a photo of Pip in the Dream Corner." },
  { id: "chat", icon: "💬", name: "Chatterbox", hint: "Ask Pip something in the chat." },
  { id: "weather", icon: "☁️", name: "Sky Watcher", hint: "Check the sky where you are." },
  { id: "egg", icon: "✨", name: "Star Whisperer", hint: "Find the shy star and poke it five times. It moves every day." },
  { id: "chaos", icon: "🌀", name: "Chaos Gremlin", hint: "Try chaos mode (in the footer)." },
  { id: "jump", icon: "🧭", name: "Pocket Navigator", hint: "Use the ✦ Jump menu to go somewhere." },
  { id: "guestbook", icon: "✍️", name: "Pen Pal", hint: "Leave a note in the guestbook." },
  { id: "share", icon: "🎁", name: "Show & Tell", hint: "Save or share a keepsake picture." },
  { id: "bedtime", icon: "⏰", name: "Bedtime Ritual", hint: "Add Pip’s bedtime to your calendar." },
  { id: "streak3", icon: "🔥", name: "Three Nights Running", hint: "Visit on 3 days in a row." },
  { id: "streak7", icon: "🏆", name: "A Whole Week", hint: "Visit on 7 days in a row." },
  { id: "pip3d", icon: "🧊", name: "Third Dimension", hint: "Poke, spin or wave at Pip in the 3D scene." },
  { id: "desktop", icon: "💾", name: "Defragmenter", hint: "Finish defragmenting dreams in Pip’s Desktop." },
  { id: "goodnight", icon: "🛏️", name: "Sweet Dreamer", hint: "Say goodnight to Pip. Out loud is optional; typing works." },
];

export type Progress = {
  stickers: Record<string, string>;
  streak: { last: string; count: number; best: number };
  days: string[];
};

const fresh = (): Progress => ({ stickers: {}, streak: { last: "", count: 0, best: 0 }, days: [] });
const SERVER: Progress = fresh();
export const PROGRESS_KEY = "pip-progress-v1";

let state: Progress = fresh();
let loaded = false;
const subs = new Set<() => void>();
const notify = () => subs.forEach((f) => f());

function load(force = false) {
  if ((loaded && !force) || typeof window === "undefined") return;
  loaded = true;
  state = fresh();
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return;
    const p = JSON.parse(raw) as Partial<Progress>;
    state = {
      stickers: p.stickers && typeof p.stickers === "object" ? p.stickers : {},
      streak: { ...state.streak, ...(p.streak ?? {}) },
      days: Array.isArray(p.days) ? p.days.filter((d) => typeof d === "string").slice(-60) : [],
    };
  } catch { /* corrupt data: start fresh */ }
}
function save() {
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(state)); } catch { /* private mode: progress lasts for this visit */ }
  notify();
}

export const getState = () => { load(); return state; };
export const getServerState = () => SERVER;
export const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
/** Call when another tab changed the data. */
export const syncFromStorage = () => { load(true); notify(); };

export const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const dayOffset = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return dayKey(d); };

/** Unlock a sticker once. Returns true only the first time. */
export function unlock(id: string): boolean {
  if (typeof window === "undefined") return false;
  load();
  if (state.stickers[id] || !STICKERS.some((s) => s.id === id)) return false;
  state = { ...state, stickers: { ...state.stickers, [id]: new Date().toISOString() } };
  save();
  window.dispatchEvent(new CustomEvent("pip:sticker", { detail: id }));
  return true;
}

/** Records today's visit and updates the night streak. */
export function touchVisit() {
  load();
  const t = dayKey(), s = state.streak;
  if (s.last === t) return { count: s.count, changed: false, broke: false, first: false };
  const continues = s.last === dayOffset(-1);
  const count = continues ? s.count + 1 : 1;
  state = { ...state, streak: { last: t, count, best: Math.max(s.best, count) }, days: [...state.days.filter((d) => d !== t), t].slice(-60) };
  save();
  if (count >= 3) unlock("streak3");
  if (count >= 7) unlock("streak7");
  return { count, changed: true, broke: !continues && !!s.last, first: !s.last };
}

export function resetProgress() { state = fresh(); loaded = true; save(); }

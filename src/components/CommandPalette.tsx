"use client";
import { useEffect, useMemo, useRef, useState } from "react";

type Cmd = { id: string; label: string; hint: string; keys: string; run: () => void };
const reduced = () => matchMedia("(prefers-reduced-motion:reduce)").matches;
const go = (id: string) => () => document.getElementById(id)?.scrollIntoView({ behavior: reduced() ? "auto" : "smooth" });
const press = (act: string) => () => document.querySelector<HTMLElement>(`[data-act="${act}"]`)?.click();

const CMDS: Cmd[] = [
  { id: "about", label: "Meet Pip", hint: "Go to", keys: "about intro facts", run: go("about") },
  { id: "projects", label: "Things Pip dreamed up", hint: "Go to", keys: "projects lullaby lantern route", run: go("projects") },
  { id: "storybook", label: "Bedtime storybook", hint: "Go to", keys: "story book pages bedtime read", run: go("storybook") },
  { id: "toys", label: "Rattle & block toys", hint: "Play", keys: "toys blocks tower rattle stack", run: go("toys") },
  { id: "growth", label: "Pip’s growth chart", hint: "Go to", keys: "growth chart height skills wall", run: go("growth") },
  { id: "dream", label: "Make me a dream", hint: "Go to", keys: "dream maker story generate", run: go("dreammaker") },
  { id: "story", label: "How Pip became a dream engineer", hint: "Go to", keys: "story origin scenes", run: go("story") },
  { id: "guestbook", label: "Sign the guestbook", hint: "Go to", keys: "guestbook note message", run: go("guestbook") },
  { id: "game", label: "Catch the falling dreams", hint: "Play", keys: "game catch play toy", run: go("catcher") },
  { id: "dark", label: "The Dark Room (nightlight)", hint: "Go to", keys: "flashlight dark room secrets", run: go("darkroom") },
  { id: "chaos", label: "Toggle chaos mode", hint: "Action", keys: "chaos wild fun", run: press("chaos") },
  { id: "theme", label: "Toggle day / night", hint: "Action", keys: "theme dark light mode", run: press("theme") },
  { id: "sound", label: "Toggle sound", hint: "Action", keys: "sound mute audio music", run: press("sound") },
  { id: "secret", label: "Secret: summon the constellation", hint: "Easter egg", keys: "secret star egg constellation wish", run: () => window.dispatchEvent(new Event("pip:egg")) },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? CMDS.filter((c) => `${c.label} ${c.keys}`.toLowerCase().includes(s)) : CMDS;
  }, [q]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((o) => !o); return; }
      // "/" opens the menu from anywhere except while typing.
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
      if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); setOpen(true); }
    };
    const show = () => setOpen(true);
    addEventListener("keydown", key);
    addEventListener("pip:palette", show);
    return () => { removeEventListener("keydown", key); removeEventListener("pip:palette", show); };
  }, []);

  useEffect(() => {
    if (!open) return;
    setQ(""); setI(0);
    const t = setTimeout(() => input.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [open]);

  const run = (c?: Cmd) => { if (!c) return; setOpen(false); setTimeout(c.run, 60); };
  if (!open) return null;

  return (
    <div className="pal-bg" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
      <div className="pal" role="dialog" aria-modal="true" aria-label="Jump menu">
        <input
          ref={input}
          value={q}
          placeholder="Where to? (try “secret”)"
          aria-label="Where do you want to jump?"
          onChange={(e) => { setQ(e.target.value); setI(0); }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
            else if (e.key === "ArrowDown") { e.preventDefault(); setI((n) => Math.min(n + 1, list.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setI((n) => Math.max(n - 1, 0)); }
            else if (e.key === "Enter") run(list[i]);
          }}
        />
        <ul role="listbox" aria-label="Commands">
          {list.map((c, n) => (
            <li key={c.id} role="option" aria-selected={n === i} className={n === i ? "on" : ""} onMouseEnter={() => setI(n)} onClick={() => run(c)}>
              <span>{c.label}</span><small>{c.hint}</small>
            </li>
          ))}
          {!list.length && <li className="none">No match. Pip is still looking…</li>}
        </ul>
        <p className="small">↑ ↓ to move · Enter to go · Esc to close · press / anywhere</p>
      </div>
    </div>
  );
}

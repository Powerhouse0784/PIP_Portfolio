"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAudio } from "@/components/Providers";
import PipHero from "@/components/PipHero";
import DrawPad from "@/components/DrawPad";
import { feel, inferFeel, isFeel, type Feel } from "@/lib/feel";
import { ACT_LINES, ACT_MOOD, isAct, parseCommand, perform } from "@/lib/pipAct";
import { canListen, listen, speakText, stopSpeaking, unlockAudio } from "@/lib/pipVoice";
import { OUTFITS, type OutfitId } from "@/lib/outfits";
import { makePhoto } from "@/lib/photoCard";
import { STORIES, type Story } from "@/lib/stories";
import { pick } from "@/lib/pipSay";

type Id = "dance" | "sing" | "story" | "magic" | "sleep" | "outfit" | "photo" | "hug" | "draw";
type Panel = "story" | "outfit" | "photo" | "magic" | "draw" | null;

const PILLS: { id: Id; icon: string; title: string; caption: string }[] = [
  { id: "dance", icon: "💃", title: "Dance", caption: "A tiny happy dance" },
  { id: "sing", icon: "🎤", title: "Sing", caption: "Hum a gentle lullaby" },
  { id: "story", icon: "📖", title: "Tell a story", caption: "A bedtime tale, just for you" },
  { id: "magic", icon: "⭐", title: "Show magic", caption: "Stardust and a wish" },
  { id: "sleep", icon: "😴", title: "Sleepy mode", caption: "Let Pip wind down" },
  { id: "outfit", icon: "🎨", title: "Change outfit", caption: "Glasses, halo, scarf…" },
  { id: "photo", icon: "📷", title: "Take a photo", caption: "A polaroid to keep" },
  { id: "hug", icon: "❤️", title: "Give a hug", caption: "Send Pip a little love" },
];
const GALLERY: { id: Id; title: string; copy: string; img?: string; pos?: string; tone: string; glyph: string }[] = [
  { id: "dance", title: "Dance a little", copy: "Move to a happy beat", img: "/images/wave.webp", pos: "50% 30%", tone: "linear-gradient(135deg,#eadcff,#c9b3ff)", glyph: "♪ ♫" },
  { id: "sing", title: "Sing a lullaby", copy: "A softer kind of magic", img: "/images/box.webp", pos: "50% 50%", tone: "linear-gradient(135deg,#f8d8ee,#d9c4f5)", glyph: "♫" },
  { id: "story", title: "Tell a bedtime story", copy: "Turn a page together", img: "/images/hero.webp", pos: "50% 22%", tone: "linear-gradient(135deg,#ffe3bd,#ffc98d)", glyph: "📖" },
  { id: "magic", title: "Do some magic", copy: "Make the stars sparkle", img: "/images/lamp.webp", pos: "50% 50%", tone: "linear-gradient(135deg,#d3dbff,#a9b7f5)", glyph: "✦" },
  { id: "draw", title: "Draw something", copy: "Doodle together", tone: "linear-gradient(135deg,#ffdcd4,#ffc3b6)", glyph: "✎" },
  { id: "sleep", title: "Go to sleep", copy: "Wind down with Pip", img: "/images/hero.webp", pos: "50% 30%", tone: "linear-gradient(135deg,#c9d3f6,#9fb0e8)", glyph: "☾" },
];
/** Original four-line lullaby, shown one line at a time while the music plays. */
const LULLABY = ["Hush now, little star, the moon is near…", "Close your eyes, there is nothing to fear…", "Pip will hum while the night-lights glow…", "Sleep, little dreamer… sleep slow."];

const INTENT: [RegExp, Id][] = [
  [/\b(story|tale|fairy ?tale)\b/, "story"],
  [/\b(draw|paint|sketch|doodle)\b/, "draw"],
  [/\b(photo|picture|selfie|camera|snapshot)\b/, "photo"],
  [/\b(outfit|dress|costume|glasses|scarf|bow ?tie|halo|crown)\b/, "outfit"],
  [/\b(magic|wish|sparkle|stardust)\b/, "magic"],
  [/\b(hug|cuddle|kiss|love you)\b/, "hug"],
  [/\b(sleep|nap|bedtime|good ?night|go to bed)\b/, "sleep"],
  [/\b(sing|lullaby|song|hum)\b/, "sing"],
  [/\b(danc(e|es|ing)|boogie)\b/, "dance"],
];
const OUTFIT_WORDS: [RegExp, OutfitId][] = [
  [/glasses|spectacles/, "glasses"], [/halo|crown/, "halo"], [/scarf/, "scarf"], [/bow ?tie/, "bow"], [/original|plain|take (it )?off|nothing/, "none"],
];
const CONFUSED = ["Hmm… I’m too sleepy to understand. Try “dance”, “tell a story” or “take a photo”!", "*tilts head* Say that again, softly?"];
const reduced = () => matchMedia("(prefers-reduced-motion:reduce)").matches;

type Burst = { id: string; ch: string; x: number; y: number; dx: number; d: number };

function Lantern({ className }: { className: string }) {
  return (
    <svg className={`dc-lantern ${className}`} viewBox="0 0 60 100">
      <circle cx="30" cy="52" r="34" fill="#ffd27a" opacity=".22" />
      <line x1="30" y1="0" x2="30" y2="14" stroke="#c9a24f" strokeWidth="2" />
      <rect x="15" y="14" width="30" height="8" rx="3" fill="#c9a24f" />
      <rect x="12" y="22" width="36" height="54" rx="12" fill="#ffd27a" />
      <rect x="12" y="22" width="36" height="54" rx="12" fill="none" stroke="#c9a24f" strokeWidth="3" />
      <rect x="18" y="76" width="24" height="7" rx="3" fill="#c9a24f" />
    </svg>
  );
}
function Scene() {
  return (
    <div className="dc-scene" aria-hidden="true">
      <svg className="dc-moon" viewBox="0 0 140 140"><defs><mask id="dcm"><rect width="140" height="140" fill="#fff" /><circle cx="92" cy="56" r="50" fill="#000" /></mask></defs><circle cx="62" cy="70" r="56" fill="#ffd783" mask="url(#dcm)" /></svg>
      {["s1 ✦", "s2 ✧", "s3 ✦", "s4 ✧", "s5 ✦", "s6 ✧"].map((s) => <span key={s} className={`dc-star ${s.split(" ")[0]}`}>{s.split(" ")[1]}</span>)}
      <Lantern className="l1" /><Lantern className="l2" />
      <svg className="dc-hills" viewBox="0 0 1200 160" preserveAspectRatio="none"><path d="M0 90 Q150 20 320 80 T640 70 T960 85 T1200 60 V160 H0Z" fill="#2c2250" /><path d="M0 125 Q200 75 420 120 T820 112 T1200 102 V160 H0Z" fill="#3a2b63" /></svg>
    </div>
  );
}
function Crayons() {
  return (
    <svg viewBox="0 0 100 100" className="dc-crayons"><rect x="14" y="40" width="72" height="48" rx="6" fill="#fffaf0" stroke="#e8cdb8" strokeWidth="2" /><path d="M24 62 q10 -14 20 0 t20 0 t20 0" fill="none" stroke="#a34063" strokeWidth="4" strokeLinecap="round" /><g transform="rotate(-28 40 26)"><rect x="34" y="6" width="10" height="34" rx="2" fill="#e8a24a" /><path d="M34 6 l5 -7 5 7z" fill="#e8a24a" /></g><g transform="rotate(14 66 26)"><rect x="60" y="6" width="10" height="34" rx="2" fill="#4f7bd9" /><path d="M60 6 l5 -7 5 7z" fill="#4f7bd9" /></g></svg>
  );
}

/**
 * Pip's Dream Corner: a night-sky scene with Pip in the middle and everything he can do around him.
 * Buttons, typed ideas and the microphone all go through the same handlers, so each activity works every way.
 */
export default function PipDreamCorner() {
  const { play, stop, blip, setOn, ensure } = useAudio();
  const [bubble, setBubble] = useState("What should I do?");
  const [active, setActive] = useState<Id | "">("");
  const [panel, setPanel] = useState<Panel>(null);
  const [sleepy, setSleepy] = useState(false);
  const [outfit, setOutfit] = useState<OutfitId>("none");
  const [idea, setIdea] = useState("");
  const [heard, setHeard] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [speakOn, setSpeakOn] = useState(true);
  const [canMic, setCanMic] = useState(false);
  const [listening, setListening] = useState(false);
  const [story, setStory] = useState<Story | null>(null);
  const [page, setPage] = useState(0);
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [flash, setFlash] = useState(false);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [wish, setWish] = useState("");
  const [wishes, setWishes] = useState<{ id: number; t: string }[]>([]);
  const [hugs, setHugs] = useState(0);

  const timers = useRef<number[]>([]);
  const busyRef = useRef(false);
  const uid = useRef(0);
  const lastStory = useRef(-1);
  const last = useRef<{ text: string; mood: Feel }>({ text: "", mood: "happy" });
  const hist = useRef<{ role: "user" | "assistant"; content: string }[]>([]);
  const mic = useRef<{ stop(): void; abort(): void } | null>(null);

  useEffect(() => {
    setCanMic(canListen());
    try { setHugs(Number(localStorage.getItem("pip-hugs")) || 0); } catch {}
    return () => { timers.current.forEach(clearTimeout); mic.current?.abort(); stopSpeaking(); };
  }, []);

  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };
  const say = (text: string, mood: Feel = "happy") => { last.current = { text, mood }; setBubble(text); feel(mood); };
  const hush = () => { timers.current.forEach(clearTimeout); timers.current = []; stop("lullaby"); stopSpeaking(); };
  const burst = (chars: string[], n = 22) => {
    if (reduced()) return;
    const k = ++uid.current;
    const items: Burst[] = Array.from({ length: n }, (_, i) => ({ id: `${k}-${i}`, ch: chars[i % chars.length], x: 6 + Math.random() * 88, y: 50 + Math.random() * 40, dx: Math.round((Math.random() - 0.5) * 140), d: Math.random() * 0.7 }));
    setBursts((c) => [...c, ...items]);
    window.setTimeout(() => setBursts((c) => c.filter((b) => !items.includes(b))), 3400);
  };

  const wake = () => {
    setSleepy(false); setActive(""); stop("sleepy");
    perform("surprise", "corner"); say("*yawn* I’m up! I’m up! What should we do?", "happy");
  };

  const openStory = async (topic?: string) => {
    setPanel("story"); setStory(null); setPage(0);
    say("Story time! Let me find a good one…", "curious");
    let s: Story | null = null;
    try {
      const r = await fetch("/api/story", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(topic ? { topic: topic.slice(0, 80) } : {}) });
      const j = (await r.json().catch(() => ({}))) as Partial<Story>;
      if (r.ok && j.title && Array.isArray(j.pages) && j.pages.length >= 2) s = { title: j.title, pages: j.pages.slice(0, 3) };
    } catch { /* offline or no key: Pip's own stories below */ }
    if (!s) {
      let i = 0;
      do { i = Math.floor(Math.random() * STORIES.length); } while (i === lastStory.current && STORIES.length > 1);
      lastStory.current = i; s = STORIES[i];
    }
    setStory(s); play("page", { cooldown: 300 });
    say(`“${s.title}”. Turn the page when you’re ready.`, "happy");
  };
  const turn = (d: number) => {
    if (!story) return;
    const n = Math.max(0, Math.min(story.pages.length - 1, page + d));
    setPage(n); play("page", { cooldown: 200 });
    if (n === story.pages.length - 1) say("The end. Sweet dreams, sleepyhead.", "sleepy");
  };

  const takePhoto = async () => {
    setPanel("photo"); setPhoto(null); setPhotoBusy(true);
    perform("wink", "corner"); say("Say cheese! 📷", "happy");
    setFlash(true); blip(988); window.setTimeout(() => setFlash(false), 380);
    try {
      setPhoto(await makePhoto(outfit, new Date().toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })));
      say("Your Pip picture is ready to save. Sweet keepsake!", "proud");
    } catch { setErr("The camera fogged up. Try again?"); }
    setPhotoBusy(false);
  };
  const savePhoto = () => { if (!photo) return; const a = document.createElement("a"); a.href = photo; a.download = "pip-dream-corner.png"; document.body.appendChild(a); a.click(); a.remove(); };
  const sharePhoto = async () => {
    if (!photo) return;
    try {
      const file = new File([await (await fetch(photo)).blob()], "pip-dream-corner.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: "Pip’s Dream Corner" }); else savePhoto();
    } catch { /* share sheet closed */ }
  };

  const sendWish = (e: FormEvent) => {
    e.preventDefault();
    const t = wish.trim().slice(0, 60);
    if (!t) return;
    const id = ++uid.current;
    setWish(""); setWishes((w) => [...w, { id, t }]);
    window.setTimeout(() => setWishes((w) => w.filter((x) => x.id !== id)), 4300);
    play("sparkle", { volume: 0.3 }); perform("wink", "corner");
    say(pick(["Wish received! The moon is very good at keeping secrets.", "I’ll tuck that wish into the sky. ✦", "What a lovely wish. The stars heard you."]), "proud");
  };

  const run = (id: Id, topic?: string, loud = false) => {
    hush(); setErr(""); setActive(id);
    if (id !== "sleep") setSleepy(false);
    switch (id) {
      case "dance":
        setPanel(null); perform("dance", "corner"); play("toy", { cooldown: 2000 });
        say("Dance break! Wiggle-wiggle, twirl, and sparkle! ✨", "giggly");
        [523, 659, 784, 659, 880, 784, 659, 523].forEach((f, i) => later(() => blip(f), i * 450));
        later(() => setActive(""), 3600);
        break;
      case "sing":
        unlockAudio(); ensure(); setOn(true); setPanel(null);
        perform("sing", "corner"); play("lullaby");
        LULLABY.forEach((l, i) => later(() => say(l, "happy"), i * 1300));
        later(() => { say("That was my favourite one. Again?", "proud"); setActive(""); }, 5600);
        break;
      case "story": void openStory(topic); break;
      case "magic":
        setPanel("magic"); perform("surprise", "corner"); burst(["✦", "✧", "★", "·"], 36); play("sparkle");
        say("A star, a wish, and a pinch of dream dust… ta-da! Whisper me a wish below.", "proud");
        break;
      case "sleep":
        if (sleepy) { wake(); break; }
        setSleepy(true); setPanel(null); perform("sleep", "corner"); stop("lullaby"); play("sleepy");
        say("Shhh… slow breaths, sleepyhead. Pip is settling down for a nap.", "sleepy");
        break;
      case "outfit":
        if (panel === "outfit") { const i = OUTFITS.findIndex((o) => o.id === outfit); pickOutfit(OUTFITS[(i + 1) % OUTFITS.length].id); break; }
        setPanel("outfit"); say("Pick something cozy! My look stays the same underneath. These are just extras.", "happy");
        break;
      case "photo": void takePhoto(); break;
      case "hug": {
        const n = hugs + 1;
        setHugs(n); try { localStorage.setItem("pip-hugs", String(n)); } catch {}
        perform("love", "corner"); burst(["♥", "♡", "♥"], 20); play("chime");
        say("Big soft hug, coming right up. You’re doing wonderfully. 💗", "shy");
        break;
      }
      case "draw":
        setPanel("draw"); perform("wink", "corner"); say("Let’s draw something together! Pick a colour and doodle.", "curious");
        break;
    }
    if (loud && speakOn && id !== "sing") void speakText(last.current.text, last.current.mood);
  };

  function pickOutfit(o: OutfitId) {
    setOutfit(o); setErr("");
    const item = OUTFITS.find((x) => x.id === o);
    perform(o === "none" ? "wink" : "bow", "corner"); play("sparkle", { volume: 0.25, cooldown: 600 });
    say(o === "none" ? "Back to my cozy original look!" : `Ooh, ${item?.label.toLowerCase()}! How do I look?`, "proud");
  }

  const doneDrawing = () => { perform("clap", "corner"); play("sparkle", { volume: 0.3 }); burst(["✦", "★"], 16); say("What a lovely drawing! I’m hanging it in the nursery.", "proud"); };

  /** Typed or spoken: built-in activities first, then moves (spin, wave…), then the AI. */
  const handle = async (raw: string) => {
    const text = raw.trim().slice(0, 160);
    if (!text || busyRef.current) return;
    setHeard(text); setErr(""); setIdea("");
    const t = text.toLowerCase();
    if (/\b(wake up|wake)\b/.test(t)) { hush(); wake(); return; }
    const hit = INTENT.find(([re]) => re.test(t));
    if (hit) {
      const w = hit[1] === "outfit" ? OUTFIT_WORDS.find(([re]) => re.test(t)) : undefined;
      if (w) { hush(); setPanel("outfit"); pickOutfit(w[1]); if (speakOn) void speakText(last.current.text, last.current.mood); return; }
      run(hit[1], text, true);
      return;
    }
    busyRef.current = true; setBusy(true); hush(); say("Pip is thinking…", "curious");
    let act = parseCommand(t);
    if (act) perform(act, "corner");
    let reply = "", mood: Feel | null = null;
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: [...hist.current.slice(-5), { role: "user", content: text }] }) });
      const j = (await res.json().catch(() => ({}))) as { reply?: string; mood?: string; act?: string; error?: string };
      if (res.ok && j.reply) {
        reply = j.reply; mood = isFeel(j.mood) ? j.mood : null;
        if (!act && isAct(j.act)) { act = j.act; perform(act, "corner"); }
      } else if (res.status === 429 && j.error) reply = j.error;
    } catch { /* offline or API asleep: Pip uses his own words */ }
    if (!reply) { reply = act ? pick(ACT_LINES[act]) : pick(CONFUSED); mood = act ? ACT_MOOD[act] : "curious"; }
    const m = mood ?? (act ? ACT_MOOD[act] : inferFeel(reply));
    hist.current = [...hist.current.slice(-5), { role: "user", content: text }, { role: "assistant", content: reply.slice(0, 300) }];
    say(reply, m);
    if (speakOn) void speakText(reply, m);
    busyRef.current = false; setBusy(false);
  };

  const submit = (e: FormEvent) => { e.preventDefault(); unlockAudio(); void handle(idea); };
  const toggleMic = () => {
    unlockAudio();
    if (listening) { mic.current?.stop(); return; }
    hush(); setErr(""); setHeard(""); setListening(true);
    mic.current = listen({ onText: setHeard, onFinal: (t) => void handle(t), onError: setErr, onEnd: () => setListening(false) });
    if (!mic.current) { setListening(false); setErr("Voice input needs Chrome, Edge or Safari. You can type instead."); }
  };

  const pill = (p: (typeof PILLS)[number]) => (
    <button key={p.id} className="dc-action" data-active={active === p.id || (p.id === "sleep" && sleepy)} aria-pressed={p.id === "sleep" ? sleepy : undefined} onClick={() => { unlockAudio(); run(p.id); }}>
      <span className="dc-icon" aria-hidden="true">{p.id === "sleep" && sleepy ? "☀️" : p.icon}</span>
      <span><b>{p.id === "sleep" && sleepy ? "Wake Pip up" : p.title}</b><small>{p.caption}</small></span>
    </button>
  );

  return (
    <section className="dream-corner" id="dream-corner" aria-labelledby="dc-title" data-sleepy={sleepy || undefined}>
      <Scene />
      <div className="dc-inner">
        <h2 id="dc-title" className="sr">Pip’s Dream Corner</h2>
        <div className="dc-speech" role="status" aria-live="polite">{bubble}</div>

        <div className="dc-layout">
          <div className="dc-col" aria-label="Choose an activity">{PILLS.slice(0, 4).map(pill)}</div>
          <div className="dc-center">
            <div className="arch dc-arch">
              <PipHero id="corner" src="/images/hero.webp" alt="Pip, your cozy dream companion" sleep={sleepy} onWake={wake}>
                <svg className="outfit" viewBox="0 0 620 931" preserveAspectRatio="none" aria-hidden="true" dangerouslySetInnerHTML={{ __html: OUTFITS.find((o) => o.id === outfit)?.svg ?? "" }} />
              </PipHero>
            </div>
            <p className="dc-cap">Pip <i>·</i> Junior Dream Engineer{hugs > 0 && <span className="dc-hugs"> · {hugs} {hugs === 1 ? "hug" : "hugs"} given</span>}</p>
          </div>
          <div className="dc-col dc-right" aria-label="More activities">{PILLS.slice(4).map(pill)}</div>
        </div>

        <form className="dc-idea" onSubmit={submit}>
          <span aria-hidden="true">✧</span>
          <label className="sr" htmlFor="pip-dream-idea">Your idea for Pip</label>
          <input id="pip-dream-idea" value={idea} onChange={(e) => setIdea(e.target.value)} maxLength={160} placeholder={listening ? "Listening…" : "Or type your own idea…"} disabled={busy} />
          {canMic && <button type="button" className="dc-mic" aria-pressed={listening} aria-label={listening ? "Stop listening" : "Talk to Pip with your voice"} onClick={toggleMic}>{listening ? "●" : "🎤"}</button>}
          <button type="submit" aria-label="Send your idea to Pip" disabled={busy || !idea.trim()}>{busy ? "…" : "➤"}</button>
        </form>
        <div className="dc-status">
          {heard && <p>You said: “{heard}”</p>}
          {err && <p className="dc-error" role="alert">{err}</p>}
          <label className="dc-opt"><input type="checkbox" checked={speakOn} onChange={(e) => { setSpeakOn(e.target.checked); if (!e.target.checked) stopSpeaking(); }} /> Pip answers out loud</label>
          <p className="dc-note">{canMic ? "Voice input is handled by your browser (Chrome sends audio to Google). " : ""}Nothing you say or draw is stored.</p>
        </div>

        {panel && (
          <div className="dc-panel" role="region" aria-label={panel === "story" ? "Bedtime story" : panel === "outfit" ? "Outfits" : panel === "photo" ? "Photo" : panel === "magic" ? "Magic" : "Drawing"}>
            <button className="dc-close" aria-label="Close this panel" onClick={() => { setPanel(null); stopSpeaking(); }}>✕</button>
            {panel === "story" && (!story ? <p className="dc-page">Pip is flipping through the books…</p> : <>
              <h3>{story.title}</h3>
              <p className="dc-page" key={page}>{story.pages[page]}</p>
              <div className="dc-row"><button className="chip" disabled={page === 0} onClick={() => turn(-1)}>← Back</button><span className="dc-note">Page {page + 1} of {story.pages.length}</span><button className="chip" disabled={page === story.pages.length - 1} onClick={() => turn(1)}>Next →</button></div>
              <div className="dc-row">
                <button className="chip" onClick={() => void speakText(story.pages[page], "sleepy")}>🔊 Read this page</button>
                <button className="chip" onClick={stopSpeaking}>Stop</button>
                <button className="chip" onClick={() => void openStory()}>Another story</button>
                <button className="chip" onClick={() => { setPanel(null); document.getElementById("storybook")?.scrollIntoView({ behavior: reduced() ? "auto" : "smooth" }); location.hash = "storybook"; }}>Open the big storybook</button>
              </div>
            </>)}
            {panel === "outfit" && <>
              <h3>Dress-up</h3>
              <div className="dc-row" role="group" aria-label="Outfits">
                {OUTFITS.map((o) => <button key={o.id} className="chip" aria-pressed={outfit === o.id} onClick={() => pickOutfit(o.id)}><span aria-hidden="true">{o.emoji}</span> {o.label}</button>)}
              </div>
              <p className="dc-note">Outfits sit on top of Pip’s official artwork. His look underneath never changes. They also show up in your photo.</p>
            </>}
            {panel === "photo" && <>
              <h3>Your Pip polaroid</h3>
              {photoBusy || !photo ? <p className="dc-page">Developing your picture…</p> : <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="dc-photo" src={photo} alt="Polaroid of Pip in the Dream Corner" />
                <div className="dc-row"><button className="btn" onClick={savePhoto}>Save photo</button><button className="chip" onClick={() => void sharePhoto()}>Share</button><button className="chip" onClick={() => void takePhoto()}>Retake</button></div>
              </>}
            </>}
            {panel === "magic" && <>
              <h3>Make a wish</h3>
              <form className="dc-row" onSubmit={sendWish}>
                <label className="sr" htmlFor="dc-wish">Your wish</label>
                <input id="dc-wish" className="dc-input" value={wish} maxLength={60} onChange={(e) => setWish(e.target.value)} placeholder="Whisper a little wish…" />
                <button className="btn" disabled={!wish.trim()}>Send to the moon</button>
              </form>
              <div className="dc-row"><button className="chip" onClick={() => { burst(["✦", "✧", "★", "·"], 36); perform("surprise", "corner"); play("sparkle"); }}>More stardust ✨</button></div>
            </>}
            {panel === "draw" && <><h3>Draw with Pip</h3><DrawPad onDone={doneDrawing} /></>}
          </div>
        )}

        <div className="dc-burst" aria-hidden="true">
          {bursts.map((b) => <i key={b.id} style={{ left: `${b.x}%`, top: `${b.y}%`, ["--dx" as string]: `${b.dx}px`, ["--d" as string]: `${b.d}s` }}>{b.ch}</i>)}
          {wishes.map((w) => <b key={w.id} className="dc-wish">✦ {w.t}</b>)}
        </div>
      </div>

      <div className="dc-gallery">
        <h3>Some more fun things you can try</h3>
        <div className="dc-gallery-grid">
          {GALLERY.map((g) => (
            <button key={g.id + g.title} className="dc-gcard" onClick={() => { unlockAudio(); document.getElementById("dream-corner")?.scrollIntoView({ behavior: reduced() ? "auto" : "smooth" }); run(g.id); }}>
              <span className="dc-gart" style={{ background: g.tone }} aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {g.img ? <img src={g.img} alt="" loading="lazy" style={{ objectPosition: g.pos }} /> : <Crayons />}
                <i>{g.glyph}</i>
              </span>
              <b>{g.title}</b><small>{g.copy}</small>
            </button>
          ))}
        </div>
      </div>
      <div className="dc-flash" data-on={flash} aria-hidden="true" />
    </section>
  );
}

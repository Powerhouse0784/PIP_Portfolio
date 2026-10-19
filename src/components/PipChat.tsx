"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { createSpeaker, stopSpeaking } from "@/lib/pipVoice";
import { unlock } from "@/lib/progress";
import { useAudio } from "./Providers";
import { FEELS, feel, inferFeel, isFeel, type Feel } from "@/lib/feel";
import { isAct, parseCommand, perform, type Act } from "@/lib/pipAct";
import { dayPart, moonPhase } from "@/lib/sky";

/** Offline rule book. Every rule has several lines so Pip never answers the same way twice in a row. */
const RULES: [RegExp, string[], Feel][] = [
  [/\b(hi|hello|hey|hiya)\b/i, ["Hello, sleepyhead! *giggle*", "Oh, hi hi! You woke the lanterns up.", "Psst… hello! I was just counting stars.", "Welcome to the nursery! Mind the sleepy snails."], "giggly"],
  [/\b(name|who)\b/i, ["I’m Pip, Junior Dream Engineer at Midnight Nursery.", "Pip! Dream engineer, nightcap wearer, professional yawner.", "They call me Pip. I build the dreams you fall asleep inside."], "happy"],
  [/\b(job|work|do|make|build)\b/i, ["I design dreams, lullabies, nightlights and bedtime stories.", "Tonight I’m tuning a lullaby. Yesterday it was a very small nightlight.", "I build dreams! Someone has to, and I’m the only one who fits in the music box."], "proud"],
  [/\b(lullaby|music|song|sing)\b/i, ["Try the Lullaby Lab! Pick a mood and press play. I hum along.", "Music! The Lullaby Lab has three moods. Brave is my favourite.", "Press play in the Lullaby Lab and watch the stars keep time."], "happy"],
  [/\b(scary|skull|bone|spooky)\b/i, ["My head is just very round and very cozy. Nothing scary here!", "Scary? I sleep with a nightlight myself!", "It’s a round head with a crooked smile. That’s all, I promise."], "shy"],
  [/\b(sleep|tired|night|dream)\b/i, ["*yawn* Me too. Close your eyes and I’ll send you a dream.", "Sleepy? Same. Try tonight’s dream card, it’s written just for you.", "Dreams are my favourite. Shall we make one?"], "sleepy"],
  [/\b(secret|egg|hidden|star)\b/i, ["Hehe… the smallest star in my hero picture loves attention. Five pokes!", "A secret? Poke the tiniest star near my nightcap. Five times, no more.", "Shh… some stars here are shy. The smallest one wants five pokes."], "giggly"],
  [/\b(game|play|toy)\b/i, ["Catch the falling dreams! Hearts are worth three. Don’t tell the stars.", "Games! Try the dream catcher. Hearts count triple.", "Let’s play! The toy shelf has a rattle that sounds like rain."], "giggly"],
  [/\b(thanks|thank)\b/i, ["You’re welcome! *giggles*", "Aww, anytime, sleepyhead.", "Thank you for visiting! I’ll leave a lantern on."], "shy"],
];
const CHIPS = ["What do you do?", "Tell me a secret", "Let’s play"];
const ASK_AGAIN = [
  "Hmm… I’m too sleepy to understand. Try “what do you do?” or “secret”.",
  "My nightcap slipped over my ears. Could you say that another way?",
  "I only half heard that, I was counting stars. Try “tell me a secret”?",
  "Yawn… that one went over my head. Ask me about my job, or the lullaby lab?",
];
const choose = <T,>(a: readonly T[], not?: T): T => { const o = a.length > 1 ? a.filter((x) => x !== not) : a; return o[Math.floor(Math.random() * o.length)]; };

/** What Pip can see: fixed-vocabulary facts the server turns into natural replies. */
const SEC_IDS = ["about", "projects", "storybook", "toys", "growth", "catcher", "darkroom", "dreammaker", "mobile3d", "daily", "story", "guestbook"];
function buildCtx() {
  const ctx: { part?: string; moon?: string; section?: string; name?: string } = {};
  try {
    ctx.part = dayPart();
    ctx.moon = moonPhase().name;
    const mid = innerHeight / 2;
    ctx.section = SEC_IDS.find((id) => { const r = document.getElementById(id)?.getBoundingClientRect(); return r && r.top <= mid && r.bottom >= mid; });
    const n = (localStorage.getItem("pip-name") ?? "").replace(/^"|"$/g, "").trim();
    if (/^[\p{L}][\p{L} '’-]{0,23}$/u.test(n)) ctx.name = n;
  } catch { /* context is a nicety */ }
  return ctx;
}
const LABELS: Record<string, string> = {
  about: "Meet Pip", projects: "my projects", storybook: "the storybook", toys: "the toys", growth: "my growth chart",
  catcher: "the dream catcher game", darkroom: "the Dark Room", dreammaker: "the dream maker", mobile3d: "the 3D dream mobile",
  story: "my story", guestbook: "the guestbook", daily: "tonight’s dream card",
};
type M = { me: boolean; text: string; go?: string | null; mood?: Feel; live?: boolean };

const reduced = () => matchMedia("(prefers-reduced-motion:reduce)").matches;

type SpeechRecognitionLike = {
  lang: string; interimResults: boolean; continuous: boolean;
  onresult: ((event: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void; stop: () => void; abort: () => void;
};
type SpeechWindow = Window & { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };

export default function PipChat() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<M[]>([{ me: false, text: "Hi! I’m Pip. Ask me anything… but softly, I’m sleepy." }]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [voice, setVoice] = useState(false);
  const [canTalk, setCanTalk] = useState(false);
  const [canListen, setCanListen] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("");
  const voiceRef = useRef(false);
  const recognition = useRef<SpeechRecognitionLike | null>(null);
  const listenWanted = useRef(false);
  const end = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const fab = useRef<HTMLButtonElement>(null);
  const busyRef = useRef(false);
  const lastLine = useRef<string | undefined>(undefined);
  const askRef = useRef<(t: string) => Promise<void>>(async () => {}); // the voice recogniser lives in a mount-once effect: it must always call the latest ask()
  const [live, setLive] = useState(false);
  const { play } = useAudio();
  const [mood, setMood] = useState<Feel | null>(null);
  const moodT = useRef(0);

  useEffect(() => { end.current?.scrollIntoView({ block: "nearest" }); }, [msgs, open, busy]);
  useEffect(() => {
    setCanTalk("speechSynthesis" in window);
    const w = window as SpeechWindow;
    const Recognition = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    setCanListen(Boolean(Recognition));
    if (Recognition) {
      const r = new Recognition();
      r.lang = "en-US"; r.interimResults = true; r.continuous = false;
      r.onresult = (event) => {
        let finalText = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) finalText += event.results[i][0].transcript;
        }
        if (finalText.trim()) {
          listenWanted.current = false; setListening(false); setVoiceStatus("I heard you. Pip is thinking…");
          void askRef.current(finalText.trim());
        }
      };
      r.onerror = (event) => {
        listenWanted.current = false; setListening(false);
        const messages: Record<string, string> = {
          "not-allowed": "Microphone permission was blocked. Allow it in your browser settings and try again.",
          "service-not-allowed": "Your browser blocked speech recognition.",
          "no-speech": "I didn’t hear anything. Try again when you’re ready.",
          "audio-capture": "I can’t find a working microphone.",
          "network": "Voice input can’t reach the speech service (offline, or this browser blocks it). You can type instead.",
          "aborted": "Microphone paused."
        };
        setVoiceStatus(messages[event.error] ?? "Voice input stopped. You can type to Pip instead.");
      };
      r.onend = () => { setListening(false); if (listenWanted.current) setVoiceStatus("Listening ended. Tap the microphone to try again."); };
      recognition.current = r;
    }
    return () => { try { recognition.current?.abort(); speechSynthesis.cancel(); } catch {} };
  }, []);

  voiceRef.current = voice; // ask() runs from a mount-once voice recogniser, so it reads the latest setting from a ref

  const ask = async (text: string) => {
    const t = text.trim().slice(0, 120);
    if (!t || busyRef.current) return;
    busyRef.current = true; setBusy(true); setLive(false); setQ("");
    unlock("chat");
    const history = [...msgs, { me: true, text: t }];
    setMsgs(history);
    // Pip speaks each sentence the moment it is written, not after the whole answer (only if his voice is on).
    const sp = voiceRef.current && canTalk ? createSpeaker("happy") : null;

    let reply = "", go: string | null = null, m: Feel | null = null, act: Act | null = null, started = false;
    // Words appear as Pip writes them. The streaming bubble is hidden from screen readers; the finished reply is announced once.
    const showLive = (txt: string) => {
      if (!started) { started = true; setLive(true); setMsgs((cur) => [...cur, { me: false, text: txt, live: true }]); }
      else setMsgs((cur) => cur.map((x, i) => (i === cur.length - 1 ? { ...x, text: txt } : x)));
    };
    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json", Accept: "application/x-ndjson" },
        body: JSON.stringify({ messages: history.slice(-7).map((m) => ({ role: m.me ? "user" : "assistant", content: m.text.slice(0, 300) })), ctx: buildCtx() }),
      });
      type Final = { reply?: string; go?: string | null; mood?: string; act?: string | null };
      if (res.ok && (res.headers.get("content-type") ?? "").includes("ndjson") && res.body) {
        const reader = res.body.getReader(), dec = new TextDecoder();
        let buf = "", typed = "", fin: Final | null = null;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let nl: number;
          while ((nl = buf.indexOf("\n")) >= 0) {
            const line = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1);
            if (!line) continue;
            let ev: { d?: string; done?: boolean } & Final;
            try { ev = JSON.parse(line); } catch { continue; }
            if (typeof ev.d === "string") { typed += ev.d; showLive(typed.trimStart()); sp?.push(typed); }
            else if (ev.done) fin = ev;
          }
        }
        reply = (fin?.reply || typed).trim();
        go = fin?.go ?? null; m = isFeel(fin?.mood) ? fin!.mood as Feel : null; act = isAct(fin?.act) ? fin!.act as Act : null;
      } else {
        const j = (await res.json().catch(() => ({}))) as Final & { error?: string; unavailable?: boolean };
        if (res.ok && j.reply) { reply = j.reply; go = j.go ?? null; m = isFeel(j.mood) ? j.mood : null; act = isAct(j.act) ? j.act : null; }
        else if (res.status === 429 && j.error) reply = j.error;
      }
    } catch { /* offline or API asleep: fall through to the rule book */ }
    if (!reply) {
      const r = RULES.find(([re]) => re.test(t));
      reply = r ? choose(r[1], lastLine.current) : choose(ASK_AGAIN, lastLine.current);
      m = r?.[2] ?? "curious";
    }
    lastLine.current = reply;
    const mood_ = m ?? inferFeel(reply);
    act ??= parseCommand(t);
    if (act) perform(act);

    // Pip's face follows the conversation: the hero art reacts, and the chat shows how he feels.
    feel(mood_); setMood(mood_);
    if (mood_ === "proud" || mood_ === "happy") play("sparkle", { cooldown: 4000, volume: 0.25 });
    clearTimeout(moodT.current); moodT.current = window.setTimeout(() => setMood(null), 8000);

    const msg: M = { me: false, text: reply, go, mood: mood_ };
    setMsgs((cur) => (started ? [...cur.slice(0, -1), msg] : [...cur, msg]));
    sp?.finish(reply);
    setLive(false); busyRef.current = false; setBusy(false);
  };
  askRef.current = ask;
  const startListening = () => {
    if (!recognition.current || busyRef.current) return;
    try {
      setVoice(true); // Voice conversation speaks Pip's reply after each recognized turn.
      setVoiceStatus("Listening… speak clearly, then pause.");
      listenWanted.current = true; setListening(true);
      recognition.current.start();
    } catch {
      listenWanted.current = false; setListening(false);
      setVoiceStatus("The microphone is already active. Wait a moment and try again.");
    }
  };
  const stopListening = () => {
    listenWanted.current = false; setListening(false);
    try { recognition.current?.stop(); } catch {}
    setVoiceStatus("Microphone paused.");
  };
  const submit = (e: FormEvent) => { e.preventDefault(); void ask(q); };
  const jump = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: reduced() ? "auto" : "smooth" });
    if (id === "storybook" || id === "toys" || id === "growth") location.hash = id;
    setOpen(false);
  };
  const toggleVoice = () => { setVoice((v) => { if (v) stopSpeaking(); return !v; }); };

  // The open chat closes itself when you tap or scroll anywhere else on the page, or press Escape, so it never gets in the way.
  useEffect(() => {
    if (!open) return;
    const t0 = performance.now(), y0 = scrollY;
    const inside = (n: EventTarget | null) => n instanceof Node && !!root.current?.contains(n);
    const close = (refocus = false) => {
      stopListening(); stopSpeaking(); setOpen(false);
      if (refocus) fab.current?.focus();
    };
    // Tap, click or pen press outside the chat. (A press on the chat button itself is handled by the button.)
    const onPress = (e: PointerEvent) => { if (!inside(e.target)) close(); };
    // Mouse wheel / trackpad outside the chat. Scrolling the message list inside the chat does not count.
    const onWheel = (e: WheelEvent) => { if (!inside(e.target)) close(); };
    // A finger drag that starts outside the chat (ignoring the tiny wobble of a tap).
    let startY = 0, outside = false;
    const onTouchStart = (e: TouchEvent) => { outside = !inside(e.target); startY = e.touches[0]?.clientY ?? 0; };
    const onTouchMove = (e: TouchEvent) => { if (outside && Math.abs((e.touches[0]?.clientY ?? startY) - startY) > 10) close(); };
    // The page itself scrolled (scrollbar drag, keyboard, momentum). Not while you are typing: on phones the on-screen keyboard
    // can nudge the page, and that must never close the chat under your thumb. Also ignored just after opening.
    const onScroll = () => {
      if (performance.now() - t0 < 500 || root.current?.contains(document.activeElement)) return;
      if (Math.abs(scrollY - y0) > 24) close();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(true); };
    document.addEventListener("pointerdown", onPress, true);
    addEventListener("wheel", onWheel, { passive: true });
    addEventListener("touchstart", onTouchStart, { passive: true });
    addEventListener("touchmove", onTouchMove, { passive: true });
    addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPress, true);
      removeEventListener("wheel", onWheel);
      removeEventListener("touchstart", onTouchStart);
      removeEventListener("touchmove", onTouchMove);
      removeEventListener("scroll", onScroll);
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <div className="chat" ref={root}>
      {open && (
        <div className="chat-panel" role="dialog" aria-label="Chat with Pip">
          <p className="chat-mood" role="status" data-feel={mood ?? "idle"}>
            <span aria-hidden="true">{mood ? FEELS[mood].emoji : "💤"}</span> {mood ? `Pip feels ${FEELS[mood].label}` : "Pip is sleepy and listening"}
          </p>
          <div className="chat-log" aria-live="polite">
            {msgs.map((m, i) => (
              <div key={i} className={m.me ? "me" : "pip"}>
                <p aria-hidden={m.live || undefined}>{m.text}</p>
                {m.go && LABELS[m.go] && <button className="chip go" onClick={() => jump(m.go as string)}>Take me to {LABELS[m.go]} →</button>}
              </div>
            ))}
            {busy && !live && <div className="pip"><p className="typing" aria-label="Pip is thinking">Pip is yawning<span>.</span><span>.</span><span>.</span></p></div>}
            <div ref={end} />
          </div>
          {voiceStatus && <p className="chat-voice-status" role="status">{voiceStatus}</p>}
          <div className="chat-chips">
            {canListen && <button className="chip voice-input" type="button" aria-pressed={listening} disabled={busy} onClick={listening ? stopListening : startListening}>{listening ? "■ Stop listening" : "🎙 Talk to Pip"}</button>}
            {CHIPS.map((c) => <button key={c} className="chip" disabled={busy} onClick={() => void ask(c)}>{c}</button>)}
            {canTalk && <button className="chip" aria-pressed={voice} onClick={toggleVoice}>{voice ? "Voice on" : "Voice off"}</button>}
          </div>
          <form onSubmit={submit}>
            <input value={q} onChange={(e) => setQ(e.target.value)} maxLength={120} placeholder="Say something to Pip…" aria-label="Message to Pip" />
            <button className="btn" aria-label="Send" disabled={busy}>➤</button>
          </form>
        </div>
      )}
      <button className="chat-fab" ref={fab} aria-expanded={open} aria-label={open ? "Close chat with Pip" : "Chat with Pip"} onClick={() => setOpen(!open)}>{open ? "✕" : mood ? FEELS[mood].emoji : "💤"}</button>
    </div>
  );
}

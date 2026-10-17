"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";

const RULES: [RegExp, string][] = [
  [/\b(hi|hello|hey|hiya)\b/i, "Hello, sleepyhead! *giggle*"],
  [/\b(name|who)\b/i, "I’m Pip, Junior Dream Engineer at Midnight Nursery."],
  [/\b(job|work|do|make|build)\b/i, "I design dreams, lullabies, nightlights and bedtime stories."],
  [/\b(lullaby|music|song|sing)\b/i, "Try the Lullaby Lab! Pick a mood and press play. I hum along."],
  [/\b(scary|skull|bone|spooky)\b/i, "My head is just very round and very cozy. Nothing scary here!"],
  [/\b(sleep|tired|night|dream)\b/i, "*yawn* Me too. Close your eyes and I’ll send you a dream."],
  [/\b(secret|egg|hidden|star)\b/i, "Hehe… the smallest star in my hero picture loves attention. Five pokes!"],
  [/\b(game|play|toy)\b/i, "Catch the falling dreams! Hearts are worth three. Don’t tell the stars."],
  [/\b(thanks|thank)\b/i, "You’re welcome! *giggles*"],
];
const CHIPS = ["What do you do?", "Tell me a secret", "Let’s play"];
const ASK_AGAIN = "Hmm… I’m too sleepy to understand. Try “what do you do?” or “secret”.";
const LABELS: Record<string, string> = {
  about: "Meet Pip", projects: "my projects", storybook: "the storybook", toys: "the toys", growth: "my growth chart",
  catcher: "the dream catcher game", darkroom: "the Dark Room", dreammaker: "the dream maker", mobile3d: "the 3D dream mobile",
  story: "my story", guestbook: "the guestbook",
};
type M = { me: boolean; text: string; go?: string | null };

const reduced = () => matchMedia("(prefers-reduced-motion:reduce)").matches;

export default function PipChat() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<M[]>([{ me: false, text: "Hi! I’m Pip. Ask me anything… but softly, I’m sleepy." }]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [voice, setVoice] = useState(false);
  const [canTalk, setCanTalk] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);

  useEffect(() => { end.current?.scrollIntoView({ block: "nearest" }); }, [msgs, open, busy]);
  useEffect(() => { setCanTalk("speechSynthesis" in window); return () => { try { speechSynthesis.cancel(); } catch {} }; }, []);

  /** Optional spoken voice (browser speech, no audio files). Off until the visitor asks for it. */
  const speak = (text: string) => {
    if (!voice || !canTalk) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text.replace(/\*[^*]+\*/g, ""));
      u.pitch = 1.7; u.rate = 0.95; u.volume = 0.8;
      speechSynthesis.speak(u);
    } catch {}
  };

  const ask = async (text: string) => {
    const t = text.trim().slice(0, 120);
    if (!t || busyRef.current) return;
    busyRef.current = true; setBusy(true); setQ("");
    const history = [...msgs, { me: true, text: t }];
    setMsgs(history);

    let reply = "", go: string | null = null;
    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.slice(-7).map((m) => ({ role: m.me ? "user" : "assistant", content: m.text.slice(0, 300) })) }),
      });
      const j = (await res.json().catch(() => ({}))) as { reply?: string; go?: string | null; error?: string; unavailable?: boolean };
      if (res.ok && j.reply) { reply = j.reply; go = j.go ?? null; }
      else if (res.status === 429 && j.error) reply = j.error;
    } catch { /* offline or API asleep: fall through to the rule book */ }
    if (!reply) reply = RULES.find(([re]) => re.test(t))?.[1] ?? ASK_AGAIN;

    setMsgs((m) => [...m, { me: false, text: reply, go }]);
    speak(reply);
    busyRef.current = false; setBusy(false);
  };
  const submit = (e: FormEvent) => { e.preventDefault(); void ask(q); };
  const jump = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: reduced() ? "auto" : "smooth" });
    if (id === "storybook" || id === "toys" || id === "growth") location.hash = id;
    setOpen(false);
  };
  const toggleVoice = () => { setVoice((v) => { if (v) { try { speechSynthesis.cancel(); } catch {} } return !v; }); };

  return (
    <div className="chat">
      {open && (
        <div className="chat-panel" role="dialog" aria-label="Chat with Pip">
          <div className="chat-log" aria-live="polite">
            {msgs.map((m, i) => (
              <div key={i} className={m.me ? "me" : "pip"}>
                <p>{m.text}</p>
                {m.go && LABELS[m.go] && <button className="chip go" onClick={() => jump(m.go as string)}>Take me to {LABELS[m.go]} →</button>}
              </div>
            ))}
            {busy && <div className="pip"><p className="typing" aria-label="Pip is thinking">Pip is yawning<span>.</span><span>.</span><span>.</span></p></div>}
            <div ref={end} />
          </div>
          <div className="chat-chips">
            {CHIPS.map((c) => <button key={c} className="chip" disabled={busy} onClick={() => void ask(c)}>{c}</button>)}
            {canTalk && <button className="chip" aria-pressed={voice} onClick={toggleVoice}>{voice ? "Voice on" : "Voice off"}</button>}
          </div>
          <form onSubmit={submit}>
            <input value={q} onChange={(e) => setQ(e.target.value)} maxLength={120} placeholder="Say something to Pip…" aria-label="Message to Pip" />
            <button className="btn" aria-label="Send" disabled={busy}>➤</button>
          </form>
        </div>
      )}
      <button className="chat-fab" aria-expanded={open} aria-label={open ? "Close chat with Pip" : "Chat with Pip"} onClick={() => setOpen(!open)}>{open ? "✕" : "💤"}</button>
    </div>
  );
}

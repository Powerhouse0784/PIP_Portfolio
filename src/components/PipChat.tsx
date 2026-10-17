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
type M = { me: boolean; text: string };

export default function PipChat() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<M[]>([{ me: false, text: "Hi! I’m Pip. Ask me anything… but softly, I’m sleepy." }]);
  const [q, setQ] = useState("");
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: "nearest" }); }, [msgs, open]);

  const ask = (text: string) => {
    const t = text.trim().slice(0, 120);
    if (!t) return;
    const reply = RULES.find(([re]) => re.test(t))?.[1] ?? "Hmm… I’m too sleepy to understand. Try “what do you do?” or “secret”.";
    setMsgs((m) => [...m, { me: true, text: t }, { me: false, text: reply }]);
    setQ("");
  };
  const submit = (e: FormEvent) => { e.preventDefault(); ask(q); };

  return (
    <div className="chat">
      {open && (
        <div className="chat-panel" role="dialog" aria-label="Chat with Pip">
          <div className="chat-log" aria-live="polite">
            {msgs.map((m, i) => <p key={i} className={m.me ? "me" : "pip"}>{m.text}</p>)}
            <div ref={end} />
          </div>
          <div className="chat-chips">{CHIPS.map((c) => <button key={c} className="chip" onClick={() => ask(c)}>{c}</button>)}</div>
          <form onSubmit={submit}>
            <input value={q} onChange={(e) => setQ(e.target.value)} maxLength={120} placeholder="Say something to Pip…" aria-label="Message to Pip" />
            <button className="btn" aria-label="Send">➤</button>
          </form>
        </div>
      )}
      <button className="chat-fab" aria-expanded={open} aria-label={open ? "Close chat with Pip" : "Chat with Pip"} onClick={() => setOpen(!open)}>{open ? "✕" : "💤"}</button>
    </div>
  );
}

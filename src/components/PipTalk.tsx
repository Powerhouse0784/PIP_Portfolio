"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAudio } from "./Providers";
import { feel, inferFeel, isFeel, type Feel } from "@/lib/feel";
import { ACT_LINES, ACT_MOOD, isAct, parseCommand, perform, talking, type Act } from "@/lib/pipAct";
import { pick } from "@/lib/pipSay";

type Res = ArrayLike<{ transcript: string }> & { isFinal: boolean };
type Rec = {
  lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number;
  start(): void; stop(): void; abort(): void;
  onresult: ((e: { results: ArrayLike<Res> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type RecCtor = new () => Rec;
const recCtor = (): RecCtor | undefined => {
  const w = window as unknown as { SpeechRecognition?: RecCtor; webkitSpeechRecognition?: RecCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
};

/** Tiny silent clip played inside a tap so the browser lets Pip's voice play later, after the AI answers. */
const SILENT = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";
const CHIPS = ["Dance!", "Spin around", "Give me a wink", "Sing me a lullaby", "Go to sleep", "Tell me a joke"];
const CONFUSED = ["Hmm… I’m too sleepy to understand. Try “dance” or “spin around”!", "*tilts head* Say that again, softly?"];
const TONE: Record<Feel, { pitch: number; rate: number }> = {
  happy: { pitch: 1.7, rate: 1 }, sleepy: { pitch: 1.2, rate: 0.8 }, giggly: { pitch: 1.9, rate: 1.1 },
  curious: { pitch: 1.75, rate: 0.95 }, proud: { pitch: 1.6, rate: 1 }, shy: { pitch: 1.6, rate: 0.88 },
};

/**
 * Talk to Pip: speak or type a command. Pip moves instantly (local word match), the AI (Gemini, then Grok, then Groq)
 * writes his answer and picks his mood and action, and he answers out loud with Gemini's voice or, failing that,
 * the browser's own free voice. Everything has an offline fallback.
 */
export default function PipTalk() {
  const { play } = useAudio();
  const [canMic, setCanMic] = useState(false);
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [speakOn, setSpeakOn] = useState(true);
  const [q, setQ] = useState("");
  const [heard, setHeard] = useState("");
  const [line, setLine] = useState("");
  const [err, setErr] = useState("");
  const rec = useRef<Rec | null>(null);
  const latest = useRef("");
  const audio = useRef<HTMLAudioElement | null>(null);
  const hist = useRef<{ role: "user" | "assistant"; content: string }[]>([]);
  const busyRef = useRef(false);
  const cloud = useRef(true); // flips off if Gemini voice is unavailable, then the browser voice takes over

  useEffect(() => {
    setCanMic(Boolean(recCtor()));
    return () => {
      rec.current?.abort(); audio.current?.pause();
      try { speechSynthesis.cancel(); } catch {}
      talking(false);
    };
  }, []);

  const unlock = () => {
    audio.current ??= new Audio();
    audio.current.src = SILENT;
    void audio.current.play().catch(() => {});
  };
  const stopVoice = () => {
    audio.current?.pause();
    try { speechSynthesis.cancel(); } catch {}
    talking(false);
  };

  const browserSpeak = (text: string, mood: Feel) => {
    try {
      const voices = speechSynthesis.getVoices();
      const v = voices.find((x) => /female|zira|samantha|aria|jenny|google uk english female/i.test(x.name)) ?? voices.find((x) => x.lang.startsWith("en"));
      const u = new SpeechSynthesisUtterance(text);
      if (v) u.voice = v;
      u.pitch = TONE[mood].pitch; u.rate = TONE[mood].rate; u.volume = 0.9;
      u.onstart = () => talking(true);
      u.onend = () => talking(false);
      u.onerror = () => talking(false);
      speechSynthesis.speak(u);
    } catch { talking(false); }
  };

  const speak = async (text: string, mood: Feel) => {
    const spoken = text.replace(/\*[^*]+\*/g, "").trim();
    if (!speakOn || !spoken) return;
    stopVoice();
    if (cloud.current) {
      try {
        const res = await fetch("/api/voice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: spoken.slice(0, 260), mood }) });
        if (res.ok && res.headers.get("content-type")?.includes("audio")) {
          const url = URL.createObjectURL(await res.blob());
          const a = (audio.current ??= new Audio());
          a.src = url;
          a.onplay = () => talking(true);
          a.onended = () => { talking(false); URL.revokeObjectURL(url); };
          try { await a.play(); return; } catch { talking(false); }
        } else if (res.status !== 429) cloud.current = false;
      } catch { cloud.current = false; }
    }
    browserSpeak(spoken, mood);
  };

  const doAct = (a: Act) => {
    perform(a);
    if (a === "sing") play("lullaby", { volume: 0.25 });
    else if (a === "clap" || a === "dance") play("toy", { cooldown: 3000 });
    else play("sparkle", { cooldown: 3000, volume: 0.25 });
  };

  const handle = async (raw: string) => {
    const text = raw.trim().slice(0, 200);
    if (!text || busyRef.current) return;
    busyRef.current = true; setBusy(true); setErr(""); setHeard(text); setLine("Pip is thinking…");
    let act = parseCommand(text); // instant, free, offline
    if (act) doAct(act);
    let reply = "", mood: Feel | null = null;
    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...hist.current.slice(-5), { role: "user", content: text }] }),
      });
      const j = (await res.json().catch(() => ({}))) as { reply?: string; mood?: string; act?: string; error?: string };
      if (res.ok && j.reply) {
        reply = j.reply; mood = isFeel(j.mood) ? j.mood : null;
        if (!act && isAct(j.act)) { act = j.act; doAct(act); }
      } else if (res.status === 429 && j.error) reply = j.error;
    } catch { /* offline or API asleep: Pip uses his own words below */ }
    if (!reply) { reply = act ? pick(ACT_LINES[act]) : pick(CONFUSED); mood = act ? ACT_MOOD[act] : "curious"; }
    const m = mood ?? (act ? ACT_MOOD[act] : inferFeel(reply));
    feel(m);
    hist.current = [...hist.current.slice(-5), { role: "user", content: text }, { role: "assistant", content: reply.slice(0, 300) }];
    setLine(reply);
    void speak(reply, m);
    busyRef.current = false; setBusy(false);
  };

  const toggleMic = () => {
    unlock();
    if (listening) { rec.current?.stop(); return; }
    const Ctor = recCtor();
    if (!Ctor) return;
    stopVoice(); setErr(""); setHeard(""); latest.current = "";
    const r = new Ctor();
    r.lang = navigator.language || "en-US"; r.interimResults = true; r.continuous = false; r.maxAlternatives = 1;
    r.onresult = (e) => {
      let t = "";
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
      latest.current = t; setHeard(t);
    };
    r.onerror = (e) => setErr(
      e.error === "not-allowed" || e.error === "service-not-allowed" ? "The microphone is blocked. Allow it in your browser’s address bar, or type instead."
        : e.error === "no-speech" ? "I didn’t hear anything. Try again?" : "Voice input hiccuped. You can type instead.",
    );
    r.onend = () => { setListening(false); const t = latest.current.trim(); if (t) void handle(t); };
    rec.current = r;
    try { r.start(); setListening(true); } catch { setListening(false); }
  };

  const submit = (e: FormEvent) => { e.preventDefault(); unlock(); void handle(q); setQ(""); };

  return (
    <div className="talk" role="group" aria-label="Talk to Pip">
      {canMic && (
        <button className="mic" aria-pressed={listening} onClick={toggleMic} disabled={busy}>
          <span aria-hidden="true">{listening ? "●" : "🎤"}</span> {listening ? "Listening… tap when done" : "Talk to Pip"}
        </button>
      )}
      <form onSubmit={submit}>
        <input value={q} onChange={(e) => setQ(e.target.value)} maxLength={120} placeholder={canMic ? "…or type: “Pip, dance!”" : "Type: “Pip, dance!”"} aria-label="Tell Pip what to do" />
        <button className="btn" aria-label="Send to Pip" disabled={busy}>➤</button>
      </form>
      <div className="talk-chips">
        {CHIPS.map((c) => <button key={c} className="chip" disabled={busy} onClick={() => { unlock(); void handle(c); }}>{c}</button>)}
      </div>
      <div className="talk-line" aria-live="polite">
        {heard && <p className="small">You: “{heard}”</p>}
        {line && <p><b>Pip:</b> {line}</p>}
        {err && <p className="err small" role="alert">{err}</p>}
        {!heard && !line && !err && <p className="small">Say “dance”, “spin around”, “wink”, “sing”, “go to sleep”… and watch his face.</p>}
      </div>
      <label className="small talk-opt"><input type="checkbox" checked={speakOn} onChange={(e) => { setSpeakOn(e.target.checked); if (!e.target.checked) stopVoice(); }} /> Pip answers out loud</label>
      <p className="small">{canMic ? "Voice input is done by your browser (Chrome sends audio to Google). " : "Voice input needs Chrome, Edge or Safari. "}Nothing is stored.</p>
    </div>
  );
}

"use client";
import { useState } from "react";
import { shareCard, type Card } from "@/lib/shareCard";
import { say } from "@/lib/pipSay";
import { unlock } from "@/lib/progress";

/** "Share my result" button: builds the keepsake card on click, so nothing is drawn until it is asked for. */
export default function ShareButton({ getCard, label }: { getCard: () => Card; label: string }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const go = async () => {
    setBusy(true); setMsg("");
    try {
      const r = await shareCard(getCard());
      if (r === "downloaded" || r === "shared") unlock("share");
      if (r === "downloaded") { setMsg("Saved as a picture. Show your friends!"); say("A keepsake! I’m blushing."); }
      else if (r === "shared") { setMsg("Shared. Pip is delighted."); say("Shared! Pip is delighted."); }
    } catch {
      setMsg("Pip couldn’t draw the card this time. Try again?");
    } finally { setBusy(false); }
  };

  return (
    <div className="share">
      <button className="chip" onClick={go} disabled={busy}>{busy ? "Drawing…" : label}</button>
      <span role="status" className="small">{msg}</span>
    </div>
  );
}

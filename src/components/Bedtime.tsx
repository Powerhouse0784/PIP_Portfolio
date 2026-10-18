"use client";
import { useEffect, useState } from "react";
import { bedtimeIcs, parseTime } from "@/lib/ics";
import { unlock } from "@/lib/progress";
import { say } from "@/lib/pipSay";

const KEY = "pip-bedtime";

/** "Add Pip's bedtime to my calendar": a repeating daily reminder as a .ics file, built right here in the browser. */
export default function Bedtime() {
  const [time, setTime] = useState("20:30");
  const [note, setNote] = useState("");

  useEffect(() => { try { const v = localStorage.getItem(KEY); if (v && parseTime(v)) setTime(v); } catch {} }, []);

  const add = () => {
    const t = parseTime(time);
    if (!t) { setNote("Please pick a time first."); return; }
    try { localStorage.setItem(KEY, time); } catch {}
    const ics = bedtimeIcs(t.hour, t.minute, location.origin);
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = "pip-bedtime.ics";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    setNote(`Saved. Open the file to add a daily ${time} reminder to your calendar.`);
    say("A bedtime ritual! Pip approves.");
    unlock("bedtime");
  };

  return (
    <div className="bed">
      <div>
        <p className="label">Make it a habit</p>
        <h3>Pip’s bedtime reminder</h3>
        <p className="small">Pick your wind-down time and add a daily reminder to your calendar. It is made in your browser and nothing is sent anywhere.</p>
      </div>
      <div className="gform">
        <label htmlFor="bedtime">Bedtime</label>
        <input id="bedtime" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        <button className="btn" onClick={add}>Add to my calendar ✦</button>
        <p className="small" role="status">{note}</p>
      </div>
    </div>
  );
}

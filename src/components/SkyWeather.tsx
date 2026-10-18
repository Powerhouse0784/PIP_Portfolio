"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { unlock } from "@/lib/progress";
import { fetchSky, findPlace, type Place, type Sky } from "@/lib/weather";
import { say } from "@/lib/pipSay";

const KEY = "pip-place";
const read = (): Place | null => { try { const v = JSON.parse(localStorage.getItem(KEY) ?? "null") as Place | null; return v && typeof v.lat === "number" && typeof v.lon === "number" && typeof v.name === "string" ? v : null; } catch { return null; } };
const announce = (kind: string | null) => window.dispatchEvent(new CustomEvent("pip:weather", { detail: kind }));

/**
 * "Check my sky": opt-in. The visitor types a town (or shares their location); Pip reads the real weather from Open-Meteo,
 * comments on it, and the rain / snow / fog is drawn over the nursery. Nothing is requested until they ask.
 */
export default function SkyWeather() {
  const [open, setOpen] = useState(false);
  const [town, setTown] = useState("");
  const [sky, setSky] = useState<Sky | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const lock = useRef(false);
  const input = useRef<HTMLInputElement>(null);

  const load = async (p: Place, speak: boolean) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setErr("");
    try {
      const s = await fetchSky(p);
      setSky(s); setOpen(false); announce(s.kind);
      unlock("weather");
      try { localStorage.setItem(KEY, JSON.stringify(p)); } catch {}
      if (speak) say(`${s.label} in ${s.place.split(",")[0]}, ${s.temp}°. ${s.line}`);
    } catch { setErr("Pip couldn’t reach the weather clouds. Try again in a moment."); }
    lock.current = false; setBusy(false);
  };

  // A returning visitor who already shared a town gets their sky again, quietly.
  useEffect(() => { const p = read(); if (p) void load(p, false); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  useEffect(() => { if (open) input.current?.focus(); }, [open]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setErr("");
    try {
      const p = await findPlace(town);
      if (!p) { setErr("Pip couldn’t find that town. Try a bigger one nearby?"); setBusy(false); return; }
      setBusy(false); await load(p, true);
    } catch { setErr("Pip couldn’t reach the weather clouds. Try again in a moment."); setBusy(false); }
  };
  const here = () => {
    if (!("geolocation" in navigator)) return setErr("This browser can’t share a location. Type a town instead.");
    setBusy(true); setErr("");
    navigator.geolocation.getCurrentPosition(
      (pos) => { setBusy(false); void load({ name: "Your sky", lat: pos.coords.latitude, lon: pos.coords.longitude }, true); },
      () => { setBusy(false); setErr("No location shared. No problem, type a town instead."); },
      { timeout: 8000, maximumAge: 600_000 },
    );
  };
  const forget = () => { try { localStorage.removeItem(KEY); } catch {} setSky(null); announce(null); setTown(""); };

  return (
    <div className="skywx">
      {sky ? (
        <div className="wx-now" role="status">
          <p><b>{sky.place.split(",")[0]}</b> · {sky.temp}° · {sky.label}{sky.isDay ? "" : " tonight"}</p>
          <p className="wx-line">“{sky.line}”</p>
          <div className="wx-acts">
            <button className="chip" onClick={() => { setOpen(true); }}>Change town</button>
            <button className="chip" onClick={forget}>Forget my town</button>
          </div>
        </div>
      ) : null}
      {!sky && !open && <button className="chip wx-open" onClick={() => setOpen(true)}>☁ Check the sky where you are</button>}
      {open && (
        <form className="wx-form" onSubmit={(e) => void submit(e)}>
          <label htmlFor="wxtown">Your town</label>
          <div className="wx-row">
            <input id="wxtown" ref={input} value={town} maxLength={60} placeholder="e.g. Pune" autoComplete="off" onChange={(e) => setTown(e.target.value)} />
            <button className="btn" disabled={busy || town.trim().length < 2}>{busy ? "Looking…" : "Check"}</button>
          </div>
          <div className="wx-row">
            <button type="button" className="chip" onClick={here} disabled={busy}>Use my location instead</button>
            <button type="button" className="chip" onClick={() => setOpen(false)}>Never mind</button>
          </div>
          <p className="small">Only the town you type (or your coordinates) goes to Open-Meteo, a free weather service. Pip remembers it in this browser only.</p>
        </form>
      )}
      {err && <p className="small err" role="alert">{err}</p>}
      {(sky || open) && <p className="small wx-credit">Weather data by <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo.com</a></p>}
    </div>
  );
}

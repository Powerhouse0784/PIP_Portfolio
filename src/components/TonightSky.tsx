"use client";
import SkyWeather from "./SkyWeather";
import { useEffect, useState } from "react";
import MoonPhase from "./MoonPhase";
import { greeting, moonPhase, type Moon } from "@/lib/sky";

/** Tonight's real moon phase and Pip's time-of-day greeting. Computed in the browser from the clock: no API, nothing sent anywhere. */
export default function TonightSky() {
  const [s, setS] = useState<{ moon: Moon; hello: string } | null>(null);
  useEffect(() => {
    const tick = () => { const now = new Date(); setS({ moon: moonPhase(now), hello: greeting(now).replace(/\*/g, "") }); };
    tick();
    const id = setInterval(tick, 10 * 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="tonight-wrap">
    <div className="tonight" aria-label="Tonight’s sky">
      {s ? (
        <>
          <MoonPhase phase={s.moon.phase} size={56} label={`${s.moon.name}, ${Math.round(s.moon.lit * 100)} percent lit`} />
          <div>
            <p className="tn-k">Tonight’s sky</p>
            <p className="tn-moon"><b>{s.moon.name}</b> · {Math.round(s.moon.lit * 100)}% lit</p>
            <p className="tn-next">{s.moon.next}</p>
            <p className="tn-hello">{s.hello}</p>
          </div>
        </>
      ) : <span className="tn-wait" aria-hidden="true" />}
    </div>
    <SkyWeather />
    </div>
  );
}

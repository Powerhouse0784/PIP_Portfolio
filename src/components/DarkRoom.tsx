"use client";

import { useRef, useState } from "react";
import { unlock } from "@/lib/progress";

const SECRETS = [
  ["☾", "Pip’s very first nightcap was a sock."],
  ["✦", "Wish #1: a lullaby for every window."],
  ["♪", "Hum in the dark and the dark hums back."],
  ["♡", "The smallest star in the hero loves attention."],
];

/**
 * The two states intentionally use separate class names and scoped styles.
 * The light-off flashlight mask is applied to an overlay that exactly matches
 * the room bounds; the light-on view has no mask at all.
 */
export default function DarkRoom() {
  const roomRef = useRef<HTMLDivElement>(null);
  const [lit, setLit] = useState(false);

  function aim(clientX: number, clientY: number) {
    unlock("darkroom");
    if (lit || !roomRef.current) return;
    const rect = roomRef.current.getBoundingClientRect();
    roomRef.current.style.setProperty("--dr5-x", `${clientX - rect.left}px`);
    roomRef.current.style.setProperty("--dr5-y", `${clientY - rect.top}px`);
  }

  return (
    <section id="darkroom">
      <div className="wrap">
        <p className="label">Nightlight cursor</p>
        <h2>The Dark Room</h2>
        <p className="small" style={{ marginBottom: 16 }}>
          Move your pointer, or tap and drag a finger, to shine Pip’s nightlight on his secrets. Or switch the room light on.
        </p>

        {lit ? (
          <div className="dr5-lit-room" role="region" aria-label="The Dark Room with the light on">
            <p className="dr5-lit-heading">The whole room is glowing ✨</p>
            <ul className="dr5-lit-grid">
              {SECRETS.map(([symbol, secret]) => (
                <li className="dr5-lit-card" key={symbol}>
                  <span className="dr5-symbol" aria-hidden="true">{symbol}</span>
                  <p>{secret}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div
            ref={roomRef}
            className="dr5-dark-room"
            onPointerDown={(event) => aim(event.clientX, event.clientY)}
            onPointerMove={(event) => aim(event.clientX, event.clientY)}
            onTouchMove={(event) => {
              const touch = event.touches[0];
              if (touch) aim(touch.clientX, touch.clientY);
            }}
          >
            <p className="dr5-dark-hint">
              shhh… it’s dark in here
              <span>Move your pointer to find the secrets</span>
            </p>
            <ul className="dr5-dark-secrets" aria-label="Secrets revealed by the nightlight">
              {SECRETS.map(([symbol, secret]) => (
                <li key={symbol}>
                  <span aria-hidden="true">{symbol}</span>
                  <p>{secret}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          type="button"
          className="chip dr-switch"
          aria-pressed={lit}
          onClick={() => {
            unlock("darkroom");
            setLit((current) => !current);
          }}
        >
          {lit ? "Turn the room light off" : "Turn the room light on"}
        </button>
      </div>
    </section>
  );
}

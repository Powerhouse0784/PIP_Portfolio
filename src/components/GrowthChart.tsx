"use client";
import { useEffect, useRef, useState } from "react";
import Receipt from "./Receipt";
import ShareButton from "./ShareButton";
import { nextReceipt, type R } from "@/lib/receipt";

const MIN = 50, MAX = 100; // cm shown on the wall
const MARKS = [
  { cm: 54, skill: "Giggling", when: "Month 1", note: "First giggle. Still his strongest skill." },
  { cm: 61, skill: "Humming in tune", when: "Month 3", note: "Found the melody the little star brought down." },
  { cm: 68, skill: "Lantern lighting", when: "Month 5", note: "Can warm a lantern up with one very careful breath." },
  { cm: 76, skill: "Rooftop navigation", when: "Month 8", note: "Knows every chimney in Midnight Nursery by its yawn." },
  { cm: 85, skill: "Bedtime storytelling", when: "Month 11", note: "Stories now come with page-turns and a sleepy voice." },
  { cm: 95, skill: "Dream engineering", when: "Month 14", note: "Junior Dream Engineer. Hard hat is still a nightcap." },
];
const pct = (cm: number) => ((cm - MIN) / (MAX - MIN)) * 100;

/** Pip’s growth chart: skills are pencil marks on the nursery wall, and Pip grows to the mark you pick. */
export default function GrowthChart() {
  const [sel, setSel] = useState(MARKS.length - 1);
  const [grown, setGrown] = useState(false);
  const [rec, setRec] = useState<R | null>(null);
  const wall = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wall.current;
    if (!el) return;
    if (matchMedia("(prefers-reduced-motion:reduce)").matches || !("IntersectionObserver" in window)) { setGrown(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setGrown(true); io.disconnect(); } }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const m = MARKS[sel];
  const pick = (i: number) => { setSel(i); setRec(nextReceipt(`Measured: ${MARKS[i].skill}, ${MARKS[i].cm} cm.`)); };
  const replay = () => {
    setGrown(false); setSel(0);
    requestAnimationFrame(() => requestAnimationFrame(() => { setGrown(true); }));
  };

  return (
    <div className="gc">
      <div ref={wall} className={`wall${grown ? " grown" : ""}`}>
        <div className="gpip" style={{ height: `calc((100% - 50px) * ${pct(m.cm) / 100})` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/wave.webp" alt={`Pip, ${m.cm} centimetres tall`} loading="lazy" />
        </div>
        <div className="ruler" aria-hidden="true">
          {Array.from({ length: (MAX - MIN) / 5 + 1 }, (_, i) => MIN + i * 5).map((cm) => (
            <span key={cm} style={{ bottom: `${pct(cm)}%` }}>{cm}</span>
          ))}
        </div>
        <ul className="marks">
          {MARKS.map((k, i) => (
            <li key={k.skill} style={{ bottom: `${pct(k.cm)}%`, ["--d" as string]: `${i * 0.18}s` }}>
              <button className="mark" aria-pressed={sel === i} onClick={() => pick(i)} aria-label={`${k.skill}, ${k.cm} centimetres, ${k.when}`}>
                <i aria-hidden="true" />
                <span><b>{k.skill}</b> <small>{k.cm} cm · {k.when}</small></span>
              </button>
            </li>
          ))}
        </ul>
        <div className="base" aria-hidden="true" />
      </div>
      <div className="gnote">
        <p className="label">{m.when} · {m.cm} cm</p>
        <h4>{m.skill}</h4>
        <p aria-live="polite">{m.note}</p>
        <div className="gactions">
          <button className="chip" onClick={replay}>Measure Pip again ✦</button>
          <ShareButton
            label="Share this mark ✦"
            getCard={() => ({
              kicker: `Growth chart · ${m.when}`, title: m.skill, big: String(m.cm), unit: "cm tall",
              lines: [m.note], filename: `pip-growth-${m.cm}cm.png`, shareText: `Pip, ${m.cm} cm tall: ${m.skill}. See his nursery growth chart!`,
            })}
          />
        </div>
        <Receipt r={rec} />
      </div>
    </div>
  );
}

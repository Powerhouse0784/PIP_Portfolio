"use client";
import { useEffect, useRef, useState } from "react";
import { Star } from "./Icons";

const SCENES = [
  { sky: "a", title: "A star fell into the nursery", text: "One quiet evening, a tiny star slipped through the clouds and landed beside my cradle. It hummed a melody I had never heard." },
  { sky: "b", title: "Every melody held a dream", text: "I learned the humming could help little creatures imagine places where they felt safe, brave and loved. The lanterns warmed up." },
  { sky: "c", title: "And so, I began to build", text: "Now I deliver tiny dreams across the rooftops. Every night another window glows, and another little creature sleeps peacefully." },
];

export default function Story() {
  const [current, setCurrent] = useState(0);
  const [seen, setSeen] = useState<boolean[]>([false, false, false]);
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      const i = Number((e.target as HTMLElement).dataset.i);
      setSeen((s) => s.map((v, j) => v || j === i));
      setCurrent(i);
    }), { threshold: 0.35 });
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section id="story" data-s={current}>
      <div className="wrap">
        <p className="label">Once upon a bedtime</p>
        <h2>How I became a dream engineer</h2>
        <div className="rail" aria-hidden="true">
          {SCENES.map((_, i) => <i key={i} className={i <= current ? "on" : ""} />)}
        </div>
        <div className="scenes">
          {SCENES.map((s, i) => (
            <div key={s.title} data-i={i} ref={(el) => { refs.current[i] = el; }} className={`scene${seen[i] ? " in" : ""}`}>
              <div className={`sk ${s.sky}`}>
                {i === 0 && <Star className="fall" />}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {i === 1 && <img src="/images/lamp.webp" alt="" loading="lazy" />}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {i === 2 && <img src="/images/wave.webp" alt="" loading="lazy" style={{ objectPosition: "50% 25%" }} />}
              </div>
              <div className="tx">
                <span className="num">0{i + 1}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

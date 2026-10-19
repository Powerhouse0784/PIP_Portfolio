"use client";
import { useState } from "react";
import { useAudio } from "./Providers";
import { say, pick } from "@/lib/pipSay";

const CHAPTERS = [
  { number: "01", tag: "THE BEGINNING", title: "A little star found its way home", text: "One quiet evening, a tiny star slipped through the clouds and landed beside my cradle. It hummed a melody I had never heard — and everything began to glow.", icon: "✦", accent: "rose" },
  { number: "02", tag: "THE DISCOVERY", title: "Every melody held a dream", text: "I discovered that a gentle tune could turn worries into wonder. I built lanterns, collected sleepy stories, and helped little creatures imagine places where they felt safe.", icon: "♫", accent: "violet" },
  { number: "03", tag: "THE MISSION", title: "Now I build dreams for everyone", text: "These days, I deliver tiny dreams across the rooftops. Every glowing window means someone feels a little safer, a little braver, and ready for a beautiful night's sleep.", icon: "☾", accent: "blue" },
];
const HOUSE_LABELS = ["Milo's room", "The cloud house", "Little Luna", "The quiet nook", "Pip's friends", "The moon cottage", "The last light"];

export default function Story() {
  const { blip } = useAudio();
  const [chapter, setChapter] = useState(0);
  const [lit, setLit] = useState<number[]>([]);
  const [star, setStar] = useState(false);
  const toggleHouse = (i: number) => {
    setLit(old => {
      const next = old.includes(i) ? old.filter(n => n !== i) : [...old, i];
      if (!old.includes(i)) blip(520 + (i % 4) * 110);
      if (next.length === HOUSE_LABELS.length) say("Every little window is glowing. That's a whole street full of sweet dreams!");
      return next;
    });
  };
  const tapStar = () => {
    setStar(true); blip(880);
    say(pick(["Make a wish. Quietly, so the star can hear.", "That little star started everything.", "A tiny bit of magic goes a long way."]));
    window.setTimeout(() => setStar(false), 1100);
  };
  return (
    <section id="story" className="story-next">
      <div className="wrap story-next-wrap">
        <div className="story-next-head">
          <div><p className="story-eyebrow"><span className="story-eyebrow-star">✦</span> PIP'S ORIGIN STORY <span className="story-eyebrow-line" /></p><h2>How I became a <em>dream engineer</em></h2><p className="story-deck">Every little dream starts somewhere. Mine began with one fallen star, one curious heart, and a promise to make bedtime feel magical.</p></div>
          <div className="story-stamp" aria-label="Made with a little magic"><span>✧</span><small>MADE OF</small><b>Wonder<br/> &amp; dreams</b><span>✧</span></div>
        </div>

        <div className="story-showcase">
          <div className="story-sky-art" aria-label="A tiny star over the Midnight Nursery">
            <div className="story-orbit orbit-one"/><div className="story-orbit orbit-two"/><div className="story-moon-disc"/><div className="story-art-cloud cloud-a"/><div className="story-art-cloud cloud-b"/>
            <button className={`story-star-button${star ? " is-wishing" : ""}`} onClick={tapStar} aria-label="Tap the fallen star to make a wish"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 1 3.1 7.1 7.8.6-5.9 5.2 1.8 7.6-6.8-4.1-6.8 4.1 1.8-7.6L1.1 8.7l7.8-.6z"/></svg></button>
            <div className="story-art-caption"><span className="story-live-dot"/> MIDNIGHT NURSERY <span>•</span> EST. ONE WISH AGO</div>
            <div className="story-village">
              {HOUSE_LABELS.map((name, i) => <button key={name} className={`story-house house-${i}${lit.includes(i) ? " house-lit" : ""}`} onClick={() => toggleHouse(i)} aria-pressed={lit.includes(i)} aria-label={`${name}: ${lit.includes(i) ? "turn window light off" : "turn window light on"}`}><span className="house-roof"/><span className="house-body"><i/></span><span className="house-name">{name}</span></button>)}
            </div>
            <div className="story-art-footer"><span><b>{String(lit.length).padStart(2,"0")}</b> / 07 WINDOWS LIT</span><span>✦ TAP A HOUSE TO SEND IT A DREAM</span></div>
          </div>
          <div className="story-chapters">
            <div className="story-chapter-top"><span>THE STORY SO FAR</span><span>{String(chapter + 1).padStart(2,"0")} <i>/</i> 03</span></div>
            <div className="story-progress"><span style={{ width: `${((chapter + 1) / CHAPTERS.length) * 100}%` }}/></div>
            <div className={`story-chapter-card accent-${CHAPTERS[chapter].accent}`} key={chapter}>
              <div className="story-chapter-meta"><span>{CHAPTERS[chapter].number}</span><span>{CHAPTERS[chapter].tag}</span></div>
              <div className="story-chapter-icon">{CHAPTERS[chapter].icon}</div>
              <h3>{CHAPTERS[chapter].title}</h3><p>{CHAPTERS[chapter].text}</p>
              <div className="story-chapter-bottom"><span>✦ A LITTLE MORE MAGIC</span><div className="story-chapter-actions"><button type="button" aria-label="Previous chapter" disabled={chapter === 0} onClick={() => setChapter(c => Math.max(0,c-1))}>←</button><button type="button" aria-label="Next chapter" disabled={chapter === 2} onClick={() => setChapter(c => Math.min(2,c+1))}>→</button></div></div>
            </div>
            <div className="story-chapter-dots" aria-label="Choose story chapter">{CHAPTERS.map((c,i)=><button key={c.number} type="button" className={i===chapter?"active":""} onClick={()=>setChapter(i)} aria-label={`Show ${c.tag.toLowerCase()}`} aria-current={i===chapter?"step":undefined}/>)}</div>
            <p className="story-side-note"><span>✧</span> The best dreams are the ones we make together.</p>
          </div>
        </div>
        <div className="story-bottom-note"><span>✦</span><p><b>And that's my little story.</b> The rest? We're dreaming it up together.</p><span>✦</span></div>
      </div>
    </section>
  );
}

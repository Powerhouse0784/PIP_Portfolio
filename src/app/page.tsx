import LullabyLab from "@/components/LullabyLab";
import Lanterns from "@/components/Lanterns";
import DeliveryRoute from "@/components/DeliveryRoute";
import Catcher from "@/components/Catcher";
import DarkRoom from "@/components/DarkRoom";
import Greeting from "@/components/Greeting";
import ChaosToggle from "@/components/ChaosToggle";
import DreamMaker from "@/components/DreamMaker";
import Story from "@/components/Story";
import EasterEgg from "@/components/EasterEgg";
import PipHero from "@/components/PipHero";
import Guestbook from "@/components/Guestbook";
import VisitorCounter from "@/components/VisitorCounter";

const FACTS: [string, string][] = [
  ["Species", "Skull baby"], ["Profession", "Junior Dream Engineer"], ["Home", "Midnight Nursery"],
  ["Quirks", "Collects stars, loves lullabies"], ["Personality", "Kind, curious, sleepy"], ["Voice", "Soft & dreamy"],
];

export default function Home() {
  return (
    <main id="top">
      <div className="wrap">
        <div className="hero">
          <div>
            <p className="label">Midnight Nursery · Dream Department</p>
            <h1>I build the <span className="grad">dreams</span> you fall asleep inside.</h1>
            <p className="lede">Hello, sleepyhead! I’m Pip, a tiny dream engineer with big ideas and a very important bedtime job.</p>
            <a className="btn" href="#projects">Explore my little world →</a>
            <Greeting />
          </div>
          <div style={{ position: "relative" }}>
            <svg className="moon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" /></svg>
            <div className="arch">
              <PipHero src="/images/hero.webp" alt="Pip, a gentle skull baby in a star nightcap, sitting on a cloud holding a glowing lantern and a tiny unicorn music box" />
            </div>
            <EasterEgg />
          </div>
        </div>
      </div>

      <div className="marquee" aria-hidden="true">
        <div>{[0, 1].map((k) => <span key={k}>✦ now delivering dreams ✦ best viewed in dreamland ✦ please do not feed the nightlights ✦ 0% scary, 100% cozy ✦ </span>)}</div>
      </div>

      <section id="about">
        <div className="wrap about">
          <div className="arch">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/wave.webp" alt="Pip waving hello from a fluffy cloud" loading="lazy" width={600} height={730} />
          </div>
          <div>
            <p className="label">A little introduction</p>
            <h2>Meet Pip</h2>
            <p className="lede">I’m a gentle, curious baby who designs lullabies, nightlights and bedtime stories for the creatures of the neighborhood. I get sleepy easily, giggle at almost everything, and really don’t like silence.</p>
            <div className="facts">
              {FACTS.map(([k, v]) => <div className="fact" key={k}><b>{k}</b>{v}</div>)}
            </div>
          </div>
        </div>
      </section>

      <section id="projects">
        <div className="wrap">
          <p className="label">Made with a little magic</p>
          <h2>Things I’ve dreamed up</h2>

          <article className="proj" aria-labelledby="p1">
            <div className="pv">{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/images/box.webp" alt="A pink music box with a tiny unicorn on top" loading="lazy" /></div>
            <div>
              <span className="num">01</span>
              <h3 id="p1">The Lullaby Lab</h3>
              <p>Tiny melodies for minds not quite ready to sleep. Pick a mood and I’ll hum one up for you.</p>
              <LullabyLab />
            </div>
          </article>

          <article className="proj" aria-labelledby="p2">
            <Lanterns />
          </article>

          <article className="proj" aria-labelledby="p3" style={{ gridTemplateColumns: "1fr" }}>
            <div>
              <span className="num">03</span>
              <h3 id="p3">Dream Delivery Routes</h3>
              <p>A nightly trip across rooftops and sleepy homes. Tap a house to see tonight’s delivery.</p>
            </div>
            <DeliveryRoute />
          </article>
        </div>
      </section>

      <Catcher />
      <DarkRoom />
      <DreamMaker />
      <Story />
      <Guestbook />

      <footer>
        <div className="wrap">
          <a className="brand" href="#top">pip ✦</a>
          <p style={{ margin: "12px 0" }}>Made with my hands and enormous yawns. Sweet dreams.</p>
          <div className="badges" aria-label="Retro web badges">
            <span className="badge">best viewed in dreamland</span><span className="badge">made with ♥ + Next.js</span><span className="badge">no cookies for you</span><ChaosToggle />
          </div>
          <VisitorCounter />
          <p>Character &amp; artwork: haX.baby Track 1 official asset pack.</p>
        </div>
      </footer>
    </main>
  );
}

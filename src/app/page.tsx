import { LazyCatcher, LazyDarkRoom, LazyDreamMaker, LazyStorybook, LazyToys, LazyGrowthChart, LazyGuestbook } from "@/components/Lazy";
import LullabyLab from "@/components/LullabyLab";
import Lanterns from "@/components/Lanterns";
import DeliveryRoute from "@/components/DeliveryRoute";
import Greeting from "@/components/Greeting";
import ChaosToggle from "@/components/ChaosToggle";
import Story from "@/components/Story";
import EasterEgg from "@/components/EasterEgg";
import PipHero from "@/components/PipHero";
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

          <article className="proj wide" id="routes" aria-labelledby="p3">
            <div>
              <span className="num">03</span>
              <h3 id="p3">Dream Delivery Routes</h3>
              <p>A nightly trip across rooftops and sleepy homes. Tap a house to see tonight’s delivery.</p>
            </div>
            <DeliveryRoute />
          </article>

          <article className="proj wide" id="storybook" aria-labelledby="p4">
            <div>
              <span className="num">04</span>
              <h3 id="p4">Bedtime Storybook</h3>
              <p>“Goodnight, Midnight Nursery.” Turn the pages with the buttons, arrow keys, or a swipe.</p>
            </div>
            <LazyStorybook />
          </article>

          <article className="proj wide" id="toys" aria-labelledby="p5">
            <div>
              <span className="num">05</span>
              <h3 id="p5">Rattle &amp; Block Toys</h3>
              <p>Two toys from Pip’s workbench: a tower that wobbles if you’re careless, and a rattle that likes to be shaken.</p>
            </div>
            <LazyToys />
          </article>

          <article className="proj wide" id="growth" aria-labelledby="p6">
            <div>
              <span className="num">06</span>
              <h3 id="p6">Pip’s Growth Chart</h3>
              <p>Every skill is a pencil mark on the nursery wall. Tap a mark and watch Pip grow up to it.</p>
            </div>
            <LazyGrowthChart />
          </article>
        </div>
      </section>

      <LazyCatcher />
      <LazyDarkRoom />
      <LazyDreamMaker />
      <Story />
      <LazyGuestbook />

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

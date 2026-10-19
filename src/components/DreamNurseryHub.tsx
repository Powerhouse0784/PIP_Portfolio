"use client";

import Greeting from "@/components/Greeting";
import TonightSky from "@/components/TonightSky";
import StatsStrip from "@/components/StatsStrip";
import VisitorCounter from "@/components/VisitorCounter";
import EasterEgg from "@/components/EasterEgg";
import ChaosToggle from "@/components/ChaosToggle";
import { TrailToggle } from "@/components/SparkleTrail";
import { ReplayIntro } from "@/components/Intro";

export default function DreamNurseryHub() {
  return <div className="dream-nursery-hub">
    <p className="dream-hub-kicker">WELCOME HOME, DREAMER</p>
    <h3>The Midnight Nursery</h3>
    <p className="dream-hub-intro">Your little overview room. Check the sky, see the workshop stats, discover secrets, and adjust the playful atmosphere without leaving the 3D world.</p>
    <div className="dream-hub-widget"><Greeting /><TonightSky /></div>
    <div className="dream-hub-widget"><StatsStrip /></div>
    <div className="dream-hub-widget dream-hub-easter"><EasterEgg /></div>
    <div className="dream-hub-settings"><span><b>World effects</b><small>Optional visual extras from the original website</small></span><div><ChaosToggle /><TrailToggle /><ReplayIntro /></div></div>
    <div className="dream-hub-widget"><VisitorCounter /></div>
  </div>;
}

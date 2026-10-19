"use client";

import LullabyLab from "@/components/LullabyLab";
import Lanterns from "@/components/Lanterns";
import DeliveryRoute from "@/components/DeliveryRoute";
import Storybook from "@/components/Storybook";
import Toys from "@/components/Toys";
import GrowthChart from "@/components/GrowthChart";
import Catcher from "@/components/Catcher";
import DarkRoom from "@/components/DarkRoom";
import DailyDream from "@/components/DailyDream";
import DreamMaker from "@/components/DreamMaker";
import RetroDesktop from "@/components/RetroDesktop";
import Guestbook from "@/components/Guestbook";
import Goodnight from "@/components/Goodnight";
import DreamMobile from "@/components/DreamMobile";
import Pip3D from "@/components/Pip3D";
import Story from "@/components/Story";
import PipDreamCorner from "@/components/PipDreamCorner";
import Atmosphere from "@/components/Atmosphere";
import { useState } from "react";
import DreamNurseryHub from "@/components/DreamNurseryHub";

export type DreamFeatureId =
  | "lullaby" | "lanterns" | "dreams" | "stories" | "toys" | "delivery"
  | "growth" | "journal" | "darkroom" | "catcher" | "pip" | "storybook-grove"
  | "retro" | "guestbook" | "goodnight" | "dream-corner" | "pip-3d" | "dream-mobile" | "atmosphere" | "nursery-hub";

const FEATURE_META: Record<DreamFeatureId, { title: string; intro: string }> = {
  lullaby: { title: "The Lullaby Lab", intro: "Choose a mood and make a little bedtime melody." },
  lanterns: { title: "Wish Lanterns", intro: "Make a wish and send a little light into the nursery sky." },
  dreams: { title: "Dream Maker", intro: "Choose how you feel and create a personalised dream." },
  stories: { title: "Bedtime Storybook", intro: "Turn the pages of Pip’s interactive bedtime book." },
  toys: { title: "Toy Workshop", intro: "Play with Pip’s toys and experiment at the workbench." },
  delivery: { title: "Dream Delivery Routes", intro: "Explore the sleepy neighbourhood and tonight’s deliveries." },
  growth: { title: "Pip’s Growth Chart", intro: "Explore Pip’s skills and little milestones." },
  journal: { title: "Daily Dream Journal", intro: "Create a dream memory for today." },
  darkroom: { title: "The Dark Room", intro: "Discover quiet secrets in Pip’s cosy dark room." },
  catcher: { title: "Dream Catcher", intro: "Catch drifting dreams in this little arcade activity." },
  pip: { title: "Meet Pip", intro: "Talk with Pip and explore the Dream Corner." },
  "storybook-grove": { title: "Story Corner", intro: "Continue Pip’s story and discover the lore of the Midnight Nursery." },
  retro: { title: "Retro Desktop", intro: "Explore Pip’s playful old-school computer." },
  guestbook: { title: "Guestbook", intro: "Leave Pip a kind note and see messages from other visitors." },
  goodnight: { title: "Goodnight Garden", intro: "Wind down with Pip and finish the bedtime routine." },
  "dream-corner": { title: "Pip’s Dream Corner", intro: "Chat, draw, and interact with Pip using the original Dream Corner activities." },
  "pip-3d": { title: "Meet Pip in 3D", intro: "Play with Pip’s original interactive 3D character." },
  "dream-mobile": { title: "Dream Mobile", intro: "Interact with the hanging dream mobile and its playful objects." },
  atmosphere: { title: "Nursery Atmosphere", intro: "Explore the nursery’s ambient world and mood controls." },
  "nursery-hub": { title: "Midnight Nursery Hub", intro: "The overview room for the original website’s sky, stats, secrets, visitor counter and settings." },
};

export default function DreamFeatureContent({ id }: { id: DreamFeatureId }) {
  const [showExtra, setShowExtra] = useState(false);
  const meta = FEATURE_META[id];
  let activity;
  switch (id) {
    case "lullaby": activity = <LullabyLab />; break;
    case "lanterns": activity = <Lanterns />; break;
    case "dreams": activity = <DreamMaker />; break;
    case "stories": activity = <Storybook />; break;
    case "toys": activity = <Toys />; break;
    case "delivery": activity = <DeliveryRoute />; break;
    case "growth": activity = <GrowthChart />; break;
    case "journal": activity = <DailyDream />; break;
    case "darkroom": activity = <DarkRoom />; break;
    case "catcher": activity = <Catcher />; break;
    case "pip": activity = <PipDreamCorner />; break;
    case "storybook-grove": activity = <Story />; break;
    case "retro": activity = <RetroDesktop />; break;
    case "guestbook": activity = <Guestbook />; break;
    case "goodnight": activity = <Goodnight />; break;
    case "dream-corner": activity = <PipDreamCorner />; break;
    case "pip-3d": activity = <Pip3D />; break;
    case "dream-mobile": activity = <DreamMobile />; break;
    case "atmosphere": activity = <Atmosphere />; break;
    case "nursery-hub": activity = <DreamNurseryHub />; break;
  }
  return <div className="dream-activity-shell">
    <div className="dream-activity-heading"><span className="dream-modal-eyebrow">IN-WORLD ACTIVITY · ORIGINAL WORKSHOP FEATURE</span><h2>{meta.title}</h2><p>{meta.intro}</p></div>
    <div className="dream-activity-content">{activity}</div>
    <div className="dream-activity-footer"><span>✦ Your activity is running inside Dream World.</span><button type="button" onClick={() => setShowExtra(v => !v)}>{showExtra ? "Hide feature notes" : "About this feature"}</button></div>
    {showExtra && <p className="dream-activity-note">This panel mounts the existing Pip’s Dream Workshop feature component so its interactive controls and existing app logic are available here. Use the close button to return to the same spot in the 3D world.</p>}
  </div>;
}

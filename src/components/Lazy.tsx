"use client";
import dynamic from "next/dynamic";
import LazyMount from "./LazyMount";

// Heavy, below-the-fold toys: separate JS chunks, loaded only when scrolled near.
const Storybook = dynamic(() => import("./Storybook"), { ssr: false });
const Toys = dynamic(() => import("./Toys"), { ssr: false });
const GrowthChart = dynamic(() => import("./GrowthChart"), { ssr: false });
const Catcher = dynamic(() => import("./Catcher"), { ssr: false });
const DarkRoom = dynamic(() => import("./DarkRoom"), { ssr: false });
const DreamMaker = dynamic(() => import("./DreamMaker"), { ssr: false });
const Guestbook = dynamic(() => import("./Guestbook"), { ssr: false });

export const LazyStorybook = () => <LazyMount minHeight={520}><Storybook /></LazyMount>;
export const LazyToys = () => <LazyMount minHeight={560}><Toys /></LazyMount>;
export const LazyGrowthChart = () => <LazyMount minHeight={460}><GrowthChart /></LazyMount>;
export const LazyCatcher = () => <LazyMount id="catcher" minHeight={560}><Catcher /></LazyMount>;
export const LazyDarkRoom = () => <LazyMount id="darkroom" minHeight={520}><DarkRoom /></LazyMount>;
export const LazyDreamMaker = () => <LazyMount id="dreammaker" minHeight={420}><DreamMaker /></LazyMount>;
export const LazyGuestbook = () => <LazyMount id="guestbook" minHeight={520}><Guestbook /></LazyMount>;

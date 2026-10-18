import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Fraunces, Fredoka, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AudioProvider } from "@/components/Providers";
import StarField from "@/components/StarField";
import PipChat from "@/components/PipChat";
import PipReactions from "@/components/PipReactions";
import CommandPalette from "@/components/CommandPalette";
import SiteHeader from "@/components/SiteHeader";
import Intro from "@/components/Intro";
import Atmosphere from "@/components/Atmosphere";
import SoundPrompt from "@/components/SoundPrompt";
import ScrollFX from "@/components/ScrollFX";
import ScrollRail from "@/components/ScrollRail";
import WeatherFX from "@/components/WeatherFX";
import Stickers from "@/components/Stickers";
import PwaClient from "@/components/PwaClient";
import MediaSession from "@/components/MediaSession";

const serif = Fraunces({ subsets: ["latin"], axes: ["opsz"], display: "swap", variable: "--font-serif" });
const ui = Fredoka({ subsets: ["latin"], display: "swap", variable: "--font-ui" });
const body = Plus_Jakarta_Sans({ subsets: ["latin"], display: "swap", variable: "--font-body" });

// Absolute base URL so Open Graph / Twitter images resolve. Set NEXT_PUBLIC_SITE_URL to your custom domain if you have one.
const SITE =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

const DESC = "An interactive portfolio for Pip, the sleepy Junior Dream Engineer of Midnight Nursery: a playable lullaby lab, nightlights, a page-flip storybook, toys and a nursery guestbook.";
export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "Pip’s Dream Workshop", template: "%s · Pip’s Dream Workshop" },
  description: DESC,
  applicationName: "Pip’s Dream Workshop",
  icons: { icon: "/icon.svg", apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Pip", statusBarStyle: "default" },
  openGraph: { title: "Pip’s Dream Workshop", description: DESC, type: "website", images: [{ url: "/images/og.png", width: 1200, height: 630, alt: "Pip’s Dream Workshop: Pip, a gentle skull baby in a star nightcap, on a cloud" }] },
  twitter: { card: "summary_large_image", title: "Pip’s Dream Workshop", description: DESC, images: ["/images/og.png"] },
};
export const viewport: Viewport = {
  width: "device-width", initialScale: 1, viewportFit: "cover",
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#fff8f1" }, { media: "(prefers-color-scheme: dark)", color: "#211923" }],
};

// Apply the saved theme before first paint to avoid a flash.
const themeInit = `try{var t=localStorage.getItem("pip-theme");if(t)document.documentElement.dataset.theme=t}catch(e){}`;
// First visit in this tab (no #deep-link, no ?intro=0): flag the opening scene before first paint so there is no flash of the page behind it.
// Safety net: if the app never wakes up to run the scene (script blocked or failed), the overlay is dropped after 6s instead of blocking the site.
const introInit = `try{if(location.pathname==="/"&&!sessionStorage.getItem("pip-intro-seen")&&!location.hash&&!/[?&]intro=0/.test(location.search)){var d=document.documentElement;d.dataset.intro="on";setTimeout(function(){if(d.dataset.intro==="on"&&!d.dataset.introReady)delete d.dataset.intro},6000)}}catch(e){}`;

// Hero entrance (home page, motion allowed). With the opening scene: hold the hero until it starts to leave (ScrollFX plays it; the timer is a
// safety net so a failed script can never leave it hidden). Without it: play at once, straight from CSS, so first paint never waits for JavaScript.
const heroInit = `try{if(location.pathname==="/"&&!matchMedia("(prefers-reduced-motion:reduce)").matches){var h=document.documentElement;if(h.dataset.intro==="on"){h.classList.add("hero-wait");setTimeout(function(){h.classList.remove("hero-wait")},7000)}else h.classList.add("hero-go")}}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${ui.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit + introInit + heroInit }} />
      </head>
      <body>
        <noscript><style>{".scene{opacity:1!important;transform:none!important}"}</style></noscript>
        <a className="skip" href="#top">Skip to content</a>
        <StarField />
        <Atmosphere />
        <WeatherFX />
        <ScrollFX />
        <ScrollRail />
        <AudioProvider>
          <SiteHeader />
          {children}
          <CommandPalette />
          <PipChat />
          <PipReactions />
          <Intro />
          <SoundPrompt />
          <Stickers />
          <MediaSession />
          <PwaClient />
        </AudioProvider>
      </body>
    </html>
  );
}

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
  openGraph: { title: "Pip’s Dream Workshop", description: DESC, type: "website", images: [{ url: "/images/hero.webp", alt: "Pip, a gentle skull baby in a star nightcap, on a cloud" }] },
  twitter: { card: "summary_large_image", title: "Pip’s Dream Workshop", description: DESC, images: ["/images/hero.webp"] },
};
export const viewport: Viewport = {
  width: "device-width", initialScale: 1, viewportFit: "cover",
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#fff8f1" }, { media: "(prefers-color-scheme: dark)", color: "#211923" }],
};

// Apply the saved theme before first paint to avoid a flash.
const themeInit = `try{var t=localStorage.getItem("pip-theme");if(t)document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${ui.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>
        <noscript><style>{".scene{opacity:1!important;transform:none!important}"}</style></noscript>
        <a className="skip" href="#top">Skip to content</a>
        <StarField />
        <AudioProvider>
          <SiteHeader />
          {children}
          <CommandPalette />
          <PipChat />
          <PipReactions />
        </AudioProvider>
      </body>
    </html>
  );
}

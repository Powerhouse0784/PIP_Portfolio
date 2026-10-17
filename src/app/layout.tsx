import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AudioProvider } from "@/components/Providers";
import StarField from "@/components/StarField";
import PipChat from "@/components/PipChat";
import CommandPalette from "@/components/CommandPalette";
import SiteHeader from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Pip’s Dream Workshop",
  description: "An interactive portfolio for Pip, the sleepy Junior Dream Engineer of Midnight Nursery.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

// Apply the saved theme before first paint to avoid a flash.
const themeInit = `try{var t=localStorage.getItem("pip-theme");if(t)document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&family=Fredoka:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <a className="skip" href="#top">Skip to content</a>
        <StarField />
        <AudioProvider>
          <SiteHeader />
          {children}
          <CommandPalette />
          <PipChat />
        </AudioProvider>
      </body>
    </html>
  );
}

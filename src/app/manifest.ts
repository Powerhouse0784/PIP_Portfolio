import type { MetadataRoute } from "next";

type Shortcut = { name: string; short_name?: string; description?: string; url: string; icons?: { src: string; sizes: string; type: string }[] };

export default function manifest(): MetadataRoute.Manifest {
  const m: MetadataRoute.Manifest & { shortcuts: Shortcut[] } = {
    id: "/",
    name: "Pip’s Dream Workshop",
    short_name: "Pip",
    description: "An interactive portfolio for Pip, the sleepy Junior Dream Engineer of Midnight Nursery.",
    lang: "en",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#fff8f1",
    theme_color: "#a34063",
    categories: ["entertainment", "kids", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
    shortcuts: [
      { name: "Tonight’s dream card", short_name: "Dream", url: "/#daily" },
      { name: "Dream Corner", short_name: "Corner", url: "/#dream-corner" },
      { name: "My sticker book", short_name: "Stickers", url: "/?stickers=1" },
    ],
  };
  return m;
}

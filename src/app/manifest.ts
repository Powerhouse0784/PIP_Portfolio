import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pip’s Dream Workshop",
    short_name: "Pip",
    description: "An interactive portfolio for Pip, the sleepy Junior Dream Engineer.",
    start_url: "/",
    display: "standalone",
    background_color: "#fff8f1",
    theme_color: "#a34063",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}

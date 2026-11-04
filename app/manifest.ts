import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pocketly",
    short_name: "Pocketly",
    description: "Semua uangmu, satu kantong.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#059669",
    icons: [
      { src: "/pocketly.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/pocketly.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}

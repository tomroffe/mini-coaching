import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Minis Coach",
    short_name: "Minis Coach",
    description: "Training plans, drills, registers and awards for minis rugby.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f7f4",
    theme_color: "#0f5132",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}

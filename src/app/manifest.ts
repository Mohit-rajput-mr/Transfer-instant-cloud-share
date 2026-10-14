import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OrbitTransfer",
    short_name: "OrbitTransfer",
    description: "Instant, end-to-end encrypted transfer between any two browsers. No login.",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      { src: "/brand/android-chrome-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/android-chrome-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}

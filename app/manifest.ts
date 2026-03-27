import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Interior Designer AI",
    short_name: "InteriorAI",
    description:
      "Transform room photos with AI-powered interior design styles.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b1020",
    theme_color: "#1f3a8a",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}

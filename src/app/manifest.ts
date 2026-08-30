import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "National Land Acquisition & Management System",
    short_name: "Land Acquisition",
    description: "Field verification and land acquisition workflow — works offline.",
    start_url: "/app/field",
    display: "standalone",
    background_color: "#faf7f1",
    theme_color: "#16294d",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "48x48",
        type: "image/x-icon",
      },
    ],
  };
}

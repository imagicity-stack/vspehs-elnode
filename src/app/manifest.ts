import type { MetadataRoute } from "next";

// Served at /manifest.webmanifest
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "El-Node — Pre-Primary School ERP",
    short_name: "El-Node",
    description:
      "Parent, teacher, accountant and super-admin portals for pre-primary schools — attendance, daily updates, fees and analytics.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8fafc",
    theme_color: "#1d40f5",
    categories: ["education", "productivity"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Parent Login", short_name: "Parent", url: "/login" },
      { name: "Staff Login", short_name: "Staff", url: "/login/staff" },
    ],
  };
}

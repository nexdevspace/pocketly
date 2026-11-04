import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Pocketly — Semua uangmu, satu kantong.",
    template: "%s | Pocketly",
  },
  description: "Catat dan pahami semua uangmu dalam satu kantong.",
  applicationName: "Pocketly",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/pocketly.svg", apple: "/pocketly.svg" },
};

export const viewport: Viewport = {
  themeColor: "#059669",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}

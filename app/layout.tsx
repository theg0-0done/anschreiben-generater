import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  // Needed so relative Open Graph image paths resolve to absolute URLs when a
  // link is unfurled; without it Next falls back to localhost.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.bewerbify.site"),
  title: "Bewerbify",
  description: "Bewerbungs- & Anschreiben Generator",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  );
}

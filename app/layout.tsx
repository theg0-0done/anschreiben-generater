import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Anschreiben Generator",
  description: "German Ausbildung cover letter generator",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  );
}

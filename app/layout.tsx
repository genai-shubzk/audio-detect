import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Audio Authenticity Detector",
  description:
    "Upload an MP3 and let Gemini judge whether the voice is human or AI-generated.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}

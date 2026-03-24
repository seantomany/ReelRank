import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "ReelRank",
  description: "Discover, rank, and decide on movies together",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${outfit.variable}`}>
      <body className="overscroll-none">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

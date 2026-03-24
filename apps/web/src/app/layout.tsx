import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "ReelRank",
  description: "Discover, rank, and decide on movies together",
  other: {
    "viewport": "width=device-width, initial-scale=1, viewport-fit=cover",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="overscroll-none">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

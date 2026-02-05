import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Barlow_Condensed, Geist_Mono } from "next/font/google";
import Providers from "@/components/Providers";
import "./globals.css";

// Bebas Neue - Bold condensed font for headings (HYROX style)
const bebasNeue = Bebas_Neue({
  weight: "400",
  variable: "--font-bebas",
  subsets: ["latin"],
  display: "swap",
});

// Barlow Condensed - Athletic body font
const barlowCondensed = Barlow_Condensed({
  weight: ["400", "500", "600", "700"],
  variable: "--font-barlow",
  subsets: ["latin"],
  display: "swap",
});

// Keep Geist Mono for timers and numbers
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HYTRAIN - Train Anywhere, Race Ready",
  description: "Equipment-adaptive HYROX training app with race simulations, pacing calculator, and progress tracking. Train for HYROX with whatever equipment you have.",
  keywords: ["HYROX", "fitness", "training", "race simulation", "workout generator", "HYTRAIN"],
  icons: {
    icon: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${bebasNeue.variable} ${barlowCondensed.variable} ${geistMono.variable} antialiased bg-black text-white`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

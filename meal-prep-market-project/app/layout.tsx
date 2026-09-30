// app/layout.tsx

import type { Metadata } from "next";
import { Fraunces, Public_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
});

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-public-sans",
  weight: ["400", "500", "600"],
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-plex-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: {
    default: "Meal Prep Market — Find a local cook, Gold Coast",
    template: "%s | Meal Prep Market",
  },
  description:
    "Browse independent Gold Coast cooks for custom weekly meal prep — in-home or delivered.",
  openGraph: {
    siteName: "Meal Prep Market",
    title: "Meal Prep Market — Find a local cook, Gold Coast",
    description:
      "Browse independent Gold Coast cooks for custom weekly meal prep — in-home or delivered.",
    url: "https://mealprepmarket.com.au",
    locale: "en_AU",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Meal Prep Market — Find a local cook, Gold Coast",
    description:
      "Browse independent Gold Coast cooks for custom weekly meal prep — in-home or delivered.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${fraunces.variable} ${publicSans.variable} ${plexMono.variable} font-body bg-paper text-ink antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

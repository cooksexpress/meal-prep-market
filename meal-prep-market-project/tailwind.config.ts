// tailwind.config.ts

import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#0E0D0B",     // background: warm black
        ink: "#F5EFE3",       // primary text: soft cream
        ocean: "#D4AF63",     // brand / links / prices: champagne gold
        paprika: "#E8826A",   // alerts and warnings: soft coral
        butter: "#D4AF63",    // rating stars: gold
        hairline: "#2B2720",  // dividers, borders
        gold: "#D4AF63",      // main buttons and highlights
        surface: "#1A1815",   // cards
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        body: ["var(--font-public-sans)", "sans-serif"],
        mono: ["var(--font-plex-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;

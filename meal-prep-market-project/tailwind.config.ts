// tailwind.config.ts

import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#EDE6D6",     // background — warm sand, not the cream-cliché
        ink: "#1B2420",       // primary text — warm near-black
        ocean: "#1F5C56",     // brand / primary actions
        paprika: "#C7521F",   // CTA accent, used sparingly
        butter: "#E8B84B",    // highlight / rating stars / badges
        hairline: "#D8CDB4",  // dividers, borders
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

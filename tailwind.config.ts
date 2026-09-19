import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        /**
         * Brand red and gold, sampled straight out of the wordmark: the
         * official flag values #dd0000 and #ffcc00.
         *
         * These dress the landing page only. The app itself stays blue on
         * purpose, because red is already spoken for there: failed sends,
         * delete confirmations and validation all rely on it, and a red
         * "Senden" button sitting next to a red "Löschen" button would cost
         * the one colour the product uses to signal that something is wrong.
         */
        brand: {
          50: "#fff1f1",
          100: "#ffe0e0",
          200: "#ffc7c7",
          300: "#ffa0a0",
          400: "#fa5b5b",
          500: "#ee2222",
          600: "#dd0000",
          700: "#b90000",
          800: "#990505",
          900: "#7f0b0b",
          950: "#450202",
        },
        gold: {
          50: "#fffbeb",
          100: "#fff5c2",
          200: "#ffe985",
          300: "#ffdb47",
          400: "#ffcc00",
          500: "#e0ad00",
          600: "#b88300",
          700: "#935e02",
          800: "#7a4a08",
          900: "#683d0b",
        },
      },
      fontFamily: {
        // The landing page defines these variables on its own wrapper; every
        // other route leaves them unset and falls straight through to the
        // system stack it already used.
        sans: ["var(--font-body)", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
        display: ["var(--font-display)", "var(--font-body)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;

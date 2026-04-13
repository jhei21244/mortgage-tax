import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0d0f14",
          2: "#1a1d26",
          3: "#252836",
          4: "#343847",
        },
        amber: {
          DEFAULT: "#f0a500",
          2: "#ffc233",
        },
        text: {
          DEFAULT: "#e8e9ef",
          2: "#9da3b4",
          3: "#5c6278",
        },
        success: "#22c55e",
        danger: "#ef4444",
      },
      fontFamily: {
        serif: ["DM Serif Display", "Georgia", "serif"],
        sans: ["DM Sans", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      fontSize: {
        "2xs": "11px",
      },
    },
  },
  plugins: [],
};
export default config;

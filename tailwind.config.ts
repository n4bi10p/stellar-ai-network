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
        background: "rgb(var(--background))",
        foreground: "rgb(var(--foreground))",
        surface: "rgb(var(--surface))",
        "surface-2": "rgb(var(--surface-2))",
        border: "rgb(var(--border))",
        muted: "rgb(var(--muted))",
        accent: "rgb(var(--accent))",
      },
    },
  },
  plugins: [],
};
export default config;

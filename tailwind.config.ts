import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "var(--color-brand)",
          foreground: "var(--color-brand-foreground)",
        },
        bg: "var(--color-bg)",
        panel: "var(--color-panel)",
        muted: "var(--color-muted)",
        ok: "var(--color-ok)",
        warn: "var(--color-warn)",
        danger: "var(--color-danger)",
        info: "var(--color-info)",
        border: "var(--color-border)",
      },
    },
  },
  plugins: [],
};

export default config;

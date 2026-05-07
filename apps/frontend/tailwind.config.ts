import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      boxShadow: {
        glow: "0 0 32px rgba(45, 212, 191, 0.18)",
        warm: "0 0 32px rgba(251, 146, 60, 0.22)"
      },
      opacity: {
        6: "0.06",
        8: "0.08",
        12: "0.12",
        16: "0.16",
        18: "0.18"
      }
    }
  },
  plugins: []
} satisfies Config;

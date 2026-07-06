import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        cream: "#fff8ec",
        sand: "#f4e7d3",
        caramel: "#c36b20",
        cocoa: "#321808",
        berry: "#a51d35",
        honey: "#f5b72f",
        pistachio: "#7c9a45",
        grape: "#7b3fa0",
        mango: "#ff8a3d"
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"]
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
        "3xl": "2rem"
      },
      boxShadow: {
        soft: "0 12px 40px rgba(50, 24, 8, 0.10)",
        lift: "0 28px 70px rgba(50, 24, 8, 0.20)",
        glow: "0 18px 55px rgba(195, 107, 32, 0.30)",
        inset: "inset 0 1px 0 rgba(255, 255, 255, 0.6)"
      },
      backgroundImage: {
        "grain": "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E\")"
      }
    }
  },
  plugins: []
};

export default config;

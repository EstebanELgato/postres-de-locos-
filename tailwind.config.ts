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
        caramel: "#c36b20",
        cocoa: "#321808",
        berry: "#a51d35",
        honey: "#f5b72f",
        pistachio: "#7c9a45"
      },
      boxShadow: {
        soft: "0 18px 55px rgba(50, 24, 8, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0F1117",
        surface: "#1C1F26",
        border: "#2A2D35",
        primary: "#6E56CF",
        "ai-accent": "#9D7FEA",
        success: "#3DD68C",
        warning: "#F5A623",
        danger: "#F2453D",
        "text-primary": "#F0F0F0",
        "text-muted": "#8B8F9A",
      },
      fontFamily: {
        sans: ["DM Sans", "sans-serif"],
        mono: ["DM Mono", "monospace"],
      },
      fontSize: {
        base: "14px",
      },
      width: {
        "icon-nav": "64px",
        "ai-panel": "320px",
      },
      minWidth: {
        "ai-panel": "320px",
      },
    },
  },
  plugins: [],
};

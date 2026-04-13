/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        midas: {
          gold: "#F59E0B",
          purple: "#7C3AED",
          dark: "#0A0A0F",
          card: "rgba(255,255,255,0.05)",
          border: "rgba(255,255,255,0.06)",
        },
      },
      fontFamily: {
        orbitron: ["Orbitron"],
        sans: ["Inter"],
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#6366f1",
        "primary-foreground": "#ffffff",
        background: "#0f172a",
        foreground: "#f8fafc",
        card: "#1e293b",
        "card-foreground": "#f8fafc",
        muted: "#334155",
        "muted-foreground": "#94a3b8",
        border: "#334155",
        destructive: "#ef4444",
        accent: "#22d3ee",
        "accent-foreground": "#0f172a",
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */

const hslVar = (name) => `hsl(var(${name}) / <alpha-value>)`;

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      colors: {
        background: hslVar("--background"),
        foreground: hslVar("--foreground"),
        card: {
          DEFAULT: hslVar("--card"),
          foreground: hslVar("--card-foreground"),
        },
        popover: {
          DEFAULT: hslVar("--popover"),
          foreground: hslVar("--popover-foreground"),
        },
        primary: {
          DEFAULT: hslVar("--primary"),
          foreground: hslVar("--primary-foreground"),
        },
        secondary: {
          DEFAULT: hslVar("--secondary"),
          foreground: hslVar("--secondary-foreground"),
        },
        muted: {
          DEFAULT: hslVar("--muted"),
          foreground: hslVar("--muted-foreground"),
        },
        accent: {
          DEFAULT: hslVar("--accent"),
          foreground: hslVar("--accent-foreground"),
        },
        destructive: {
          DEFAULT: hslVar("--destructive"),
          foreground: hslVar("--destructive-foreground"),
        },
        success: {
          DEFAULT: hslVar("--success"),
          foreground: hslVar("--success-foreground"),
        },
        warning: {
          DEFAULT: hslVar("--warning"),
          foreground: hslVar("--warning-foreground"),
        },
        border: hslVar("--border"),
        input: hslVar("--input"),
        ring: hslVar("--ring"),
        chart: {
          1: hslVar("--chart-1"),
          2: hslVar("--chart-2"),
          3: hslVar("--chart-3"),
          4: hslVar("--chart-4"),
          5: hslVar("--chart-5"),
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "kds-floating-in": {
          from: { opacity: "0", transform: "scale(0.98)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "chatbot-bounce": {
          "0%, 100%": { transform: "translateY(0)", opacity: "0.5" },
          "50%": { transform: "translateY(-4px)", opacity: "1" },
        },
        "chatbot-message-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "kds-floating-in": "kds-floating-in 120ms ease-out",
        "chatbot-bounce": "chatbot-bounce 1.2s infinite ease-in-out",
        "chatbot-message-in": "chatbot-message-in 0.16s ease-out",
      },
    },
  },
  plugins: [],
};

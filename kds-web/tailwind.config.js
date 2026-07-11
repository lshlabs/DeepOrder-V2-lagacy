/** @type {import('tailwindcss').Config} */

const hslVar = (name) => `hsl(var(${name}) / <alpha-value>)`;

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  corePlugins: {
    preflight: false,
  },
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
    },
  },
  plugins: [],
};

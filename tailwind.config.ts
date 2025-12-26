import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        korean: {
          red: "hsl(var(--korean-red))",
          blue: "hsl(var(--korean-blue))",
          green: "hsl(var(--korean-green))",
          yellow: "hsl(var(--korean-yellow))",
          pink: "hsl(var(--korean-pink))",
          purple: "hsl(var(--korean-purple))",
          orange: "hsl(var(--korean-orange))",
          teal: "hsl(var(--korean-teal))",
          cyan: "hsl(var(--korean-cyan))",
          indigo: "hsl(var(--korean-indigo))",
          gold: "hsl(var(--korean-gold))",
        },
      },
      fontFamily: {
        display: ['Raleway', 'sans-serif'],
        heading: ['Raleway', 'sans-serif'],
        body: ['Be Vietnam Pro', 'sans-serif'],
        ui: ['Be Vietnam Pro', 'sans-serif'],
      },
      fontSize: {
        // Mobile-first responsive typography
        'xs': ['0.75rem', { lineHeight: '1.5' }],
        'sm': ['0.875rem', { lineHeight: '1.5' }],
        'base': ['1rem', { lineHeight: '1.7' }],
        'lg': ['1.125rem', { lineHeight: '1.7' }],
        'xl': ['1.25rem', { lineHeight: '1.6' }],
        '2xl': ['1.5rem', { lineHeight: '1.4' }],
        '3xl': ['1.875rem', { lineHeight: '1.3' }],
        '4xl': ['2.25rem', { lineHeight: '1.2' }],
        '5xl': ['3rem', { lineHeight: '1.1' }],
        '6xl': ['3.75rem', { lineHeight: '1.1' }],
        '7xl': ['4.5rem', { lineHeight: '1.05' }],
        // Semantic sizes for cards and UI
        'card-title': ['1.25rem', { lineHeight: '1.4', fontWeight: '700' }],
        'card-title-lg': ['1.5rem', { lineHeight: '1.3', fontWeight: '700' }],
        'card-body': ['1rem', { lineHeight: '1.7' }],
        'card-caption': ['0.875rem', { lineHeight: '1.6' }],
        'button': ['0.9375rem', { lineHeight: '1.4', fontWeight: '600' }],
        'button-lg': ['1.0625rem', { lineHeight: '1.4', fontWeight: '600' }],
        'label': ['0.8125rem', { lineHeight: '1.4', fontWeight: '500' }],
        'badge': ['0.75rem', { lineHeight: '1.4', fontWeight: '600' }],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      spacing: {
        '70': '17.5rem', // 280px for sidebar
        // Consistent spacing scale
        '4.5': '1.125rem',  // 18px
        '5.5': '1.375rem',  // 22px
        '7': '1.75rem',     // 28px
        '9': '2.25rem',     // 36px
        '11': '2.75rem',    // 44px
        '13': '3.25rem',    // 52px
        '15': '3.75rem',    // 60px
        '18': '4.5rem',     // 72px
        '22': '5.5rem',     // 88px
        '26': '6.5rem',     // 104px
        '30': '7.5rem',     // 120px
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-20px)" },
        },
        "float-delayed": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-15px)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 20px hsl(var(--primary) / 0.3)" },
          "50%": { boxShadow: "0 0 40px hsl(var(--primary) / 0.5)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        slideUp: {
          from: { transform: "translateY(40px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        slideDown: {
          from: { transform: "translateY(-40px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        slideLeft: {
          from: { transform: "translateX(40px)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" },
        },
        slideRight: {
          from: { transform: "translateX(-40px)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        scaleIn: {
          from: { transform: "scale(0.9)", opacity: "0" },
          to: { transform: "scale(1)", opacity: "1" },
        },
        "bounce-subtle": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        "rotate-slow": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        "blob-morph": {
          "0%, 100%": { borderRadius: "60% 40% 30% 70% / 60% 30% 70% 40%" },
          "25%": { borderRadius: "30% 60% 70% 40% / 50% 60% 30% 60%" },
          "50%": { borderRadius: "50% 50% 40% 60% / 40% 50% 60% 50%" },
          "75%": { borderRadius: "40% 60% 50% 50% / 60% 40% 50% 50%" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        float: "float 6s ease-in-out infinite",
        "float-delayed": "float-delayed 7s ease-in-out infinite 1s",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        shimmer: "shimmer 2s infinite",
        "slide-up": "slideUp 0.7s ease-out forwards",
        "slide-down": "slideDown 0.7s ease-out forwards",
        "slide-left": "slideLeft 0.7s ease-out forwards",
        "slide-right": "slideRight 0.7s ease-out forwards",
        "fade-in": "fadeIn 0.5s ease-out forwards",
        "scale-in": "scaleIn 0.5s ease-out forwards",
        "bounce-subtle": "bounce-subtle 2s ease-in-out infinite",
        "rotate-slow": "rotate-slow 30s linear infinite",
        "blob-morph": "blob-morph 8s ease-in-out infinite",
      },
      boxShadow: {
        xs: "0 1px 2px 0 hsl(var(--foreground) / 0.05)",
        sm: "0 1px 3px 0 hsl(var(--foreground) / 0.1)",
        md: "0 4px 6px -1px hsl(var(--foreground) / 0.1)",
        lg: "0 10px 15px -3px hsl(var(--foreground) / 0.1)",
        xl: "0 20px 25px -5px hsl(var(--foreground) / 0.1)",
        "2xl": "0 25px 50px -12px hsl(var(--foreground) / 0.25)",
        "glow-primary": "0 0 40px hsl(var(--primary) / 0.3)",
        "glow-secondary": "0 0 40px hsl(var(--secondary) / 0.3)",
        glass: "0 8px 32px hsl(0 0% 0% / 0.1)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
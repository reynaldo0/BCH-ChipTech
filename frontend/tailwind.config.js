/** @type {import('tailwindcss').Config} */

// ── Skala warna ──────────────────────────────────────────────────────────────
const brand = {
  50: "#F1F4E8", 100: "#E3E9D1", 200: "#CAD6AA", 300: "#AEBF7D", 400: "#8DA05A",
  500: "#71843F", 600: "#5E7034", 700: "#4E5E2B", 800: "#3F4C25", 900: "#333D20", 950: "#202818",
}
const sand = {
  50: "#FFFDF8", 100: "#FAF7EE", 200: "#F3EBDD", 300: "#E9DEC6", 400: "#DCCBA8",
  500: "#C7B38A", 600: "#A99368", 700: "#86734E", 800: "#655638", 900: "#493D28", 950: "#2F281C",
}
const ink = {
  50: "#FBF9F5", 100: "#F1ECE4", 200: "#E2D9CE", 300: "#CBBCAF", 400: "#A89485",
  500: "#877466", 600: "#6E5B4E", 700: "#58473C", 800: "#42342B", 900: "#2B211B", 950: "#1F1712",
}
const success = {
  50: "#EEF8F2", 100: "#D6EEDF", 200: "#B0DDC1", 300: "#7FC49B", 400: "#4BA874",
  500: "#2C8D58", 600: "#217247", 700: "#1C5C3B", 800: "#174A31", 900: "#123D29", 950: "#09231A",
}
const warning = {
  50: "#FFF8E8", 100: "#FEEFC6", 200: "#FCDE92", 300: "#F8C957", 400: "#F0B02B",
  500: "#D8920F", 600: "#B87008", 700: "#92520B", 800: "#78410F", 900: "#653611", 950: "#3A1C06",
}
const danger = {
  50: "#FEF2F2", 100: "#FDE3E3", 200: "#FBCACA", 300: "#F6A3A3", 400: "#EE7373",
  500: "#E04848", 600: "#C93030", 700: "#A82525", 800: "#8B2222", 900: "#742323", 950: "#400E0E",
}
const info = {
  50: "#EFF6FF", 100: "#DCEAFD", 200: "#BED7FB", 300: "#92BCF7", 400: "#6199F0",
  500: "#3B78E7", 600: "#2B5FD0", 700: "#2449A8", 800: "#223F86", 900: "#213869", 950: "#16233F",
}

const hsl = (name) => `hsl(var(--${name}) / <alpha-value>)`

module.exports = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ── Token shadcn/ui ────────────────────────────────────────────────
        background: hsl("background"),
        foreground: hsl("foreground"),
        card: { DEFAULT: hsl("card"), foreground: hsl("card-foreground") },
        popover: { DEFAULT: hsl("popover"), foreground: hsl("popover-foreground") },
        primary: { DEFAULT: hsl("primary"), foreground: hsl("primary-foreground") },
        secondary: { DEFAULT: hsl("secondary"), foreground: hsl("secondary-foreground") },
        muted: { DEFAULT: hsl("muted"), foreground: hsl("muted-foreground") },
        accent: { DEFAULT: hsl("accent"), foreground: hsl("accent-foreground") },
        destructive: { DEFAULT: hsl("destructive"), foreground: hsl("destructive-foreground") },
        border: hsl("border"),
        input: hsl("input"),
        ring: hsl("ring"),

        // ── Sidebar ────────────────────────────────────────────────────────
        sidebar: {
          DEFAULT: hsl("sidebar"),
          foreground: hsl("sidebar-foreground"),
          accent: hsl("sidebar-accent"),
          border: hsl("sidebar-border"),
        },

        // ── Token KOMPAS (dipertahankan agar kode lama tetap jalan) ────────
        brand,
        sand,
        ink,
        line: { DEFAULT: "#E5DCCE", strong: "#D1C2B0", soft: "#F2EDE5" },
        surface: { DEFAULT: "#FFFFFF", muted: "#FBF9F5" },
        canvas: { DEFAULT: "#FBF8F1", warm: "#F3EBDD" },

        // ── Warna semantik: alert / warning / success / info ───────────────
        // DEFAULT = teks & ikon, bg = latar, border = garis, solid = tombol/penuh
        success: { ...success, DEFAULT: "#1C5C3B", bg: "#EEF8F2", border: "#B0DDC1", solid: "#217247", foreground: "#FFFFFF" },
        warning: { ...warning, DEFAULT: "#92520B", bg: "#FFF8E8", border: "#FCDE92", solid: "#D8920F", foreground: "#3A1C06" },
        danger: { ...danger, DEFAULT: "#A82525", bg: "#FEF2F2", border: "#FBCACA", solid: "#C93030", foreground: "#FFFFFF" },
        info: { ...info, DEFAULT: "#2449A8", bg: "#EFF6FF", border: "#BED7FB", solid: "#2B5FD0", foreground: "#FFFFFF" },

        // ── Warna channel marketplace ──────────────────────────────────────
        mp: { shopee: "#E0643A", tiktok: "#2A383C", lazada: "#5B67C9" },

        // ── Warna chart ────────────────────────────────────────────────────
        chart: {
          revenue: "#71843F", cost: "#C7B38A", profit: "#2B211B",
          refund: "#C93030", neutral: "#A89485", grid: "#E5DCCE",
        },

        // ── Alias untuk class lama yang sebelumnya tidak terdefinisi ───────
        // (text-deep-teal, bg-teal-mid, border-kompas-border, dst. sebelumnya
        //  tidak menghasilkan CSS sama sekali)
        "deep-teal": "#2B211B",
        "teal-mid": brand[600],
        kompas: { border: "#E5DCCE", green: "#71843F", gold: "#C7B38A" },

        // ── Remap palet bawaan Tailwind ke palet KOMPAS ────────────────────
        // Seluruh view lama yang masih memakai gray/slate/blue/emerald/red/amber
        // otomatis mengikuti design system tanpa edit per-baris.
        gray: ink, slate: ink, zinc: ink, neutral: ink, stone: ink,
        teal: brand, blue: brand, indigo: brand, sky: brand, cyan: brand,
        emerald: success, green: success, lime: success,
        red: danger, rose: danger, pink: danger,
        amber: warning, yellow: warning, orange: warning,
        purple: info, violet: info,
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "-apple-system", '"Segoe UI"', "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      borderRadius: {
        xs: "4px",
        sm: "calc(var(--radius) - 4px)",
        md: "calc(var(--radius) - 2px)",
        lg: "var(--radius)",
        xl: "calc(var(--radius) + 2px)",
        "2xl": "calc(var(--radius) + 6px)",
        "3xl": "calc(var(--radius) + 8px)",
      },
      boxShadow: {
        "2xs": "0 1px 1px rgba(43, 33, 27, 0.04)",
        xs: "0 1px 2px rgba(43, 33, 27, 0.05)",
        card: "0 1px 2px rgba(43, 33, 27, 0.05), 0 0 0 1px rgba(43, 33, 27, 0.02)",
        soft: "0 2px 8px rgba(43, 33, 27, 0.06)",
        "soft-md": "0 4px 14px rgba(43, 33, 27, 0.08)",
        pop: "0 20px 48px rgba(43, 33, 27, 0.18)",
        ring: "0 0 0 3px rgba(113, 132, 63, 0.24)",
      },
      maxWidth: { shell: "1440px" },
      transitionDuration: { DEFAULT: "160ms", drawer: "240ms" },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        rise: { from: { opacity: "0", transform: "translateY(6px)" }, to: { opacity: "1", transform: "translateY(0)" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        rise: "rise 220ms ease-out both",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

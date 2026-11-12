/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#F0F6F3",
          100: "#DDECE7",
          500: "#45958D",
          600: "#2F807D",
          700: "#246B6B",
          800: "#1C5557",
          900: "#153F42",
          950: "#102F32",
        },
        ink: {
          500: "#849295",
          600: "#65777A",
          700: "#526468",
          900: "#223438",
          950: "#172629",
        },
        line: {
          DEFAULT: "#E4E9E5",
          strong: "#D6DEDA",
          soft: "#EDF1EE",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          muted: "#F8FAF8",
        },
        canvas: {
          DEFAULT: "#F6F8F5",
          warm: "#F3F4EE",
        },
        success: {
          DEFAULT: "#23634B",
          bg: "#EAF4EE",
          border: "#CDE4D5",
        },
        warning: {
          DEFAULT: "#80551B",
          bg: "#FBF2DF",
          border: "#EEDDB7",
        },
        danger: {
          DEFAULT: "#9A3F3B",
          bg: "#F9EAE8",
          border: "#EBCBC7",
        },
        info: {
          DEFAULT: "#355D7A",
          bg: "#EAF1F6",
          border: "#CFDFEA",
        },
        mp: {
          shopee: "#D66A45",
          tiktok: "#34424A",
          lazada: "#5D68B5",
        },
        chart: {
          revenue: "#2F807D",
          cost: "#D7A35B",
          profit: "#4F8A69",
          refund: "#B96B67",
          neutral: "#8A9A9A",
          grid: "#E8EDE9",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      borderRadius: {
        xs: "6px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "20px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(23, 38, 41, 0.04)",
        pop: "0 16px 40px rgba(23, 38, 41, 0.14)",
        soft: "0 2px 10px rgba(23, 38, 41, 0.05)",
      },
      maxWidth: {
        shell: "1440px",
      },
      transitionDuration: {
        DEFAULT: "160ms",
        drawer: "220ms",
      },
    },
  },
  plugins: [],
}

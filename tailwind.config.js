/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Champagne gold — the agency's accent color, replacing the old tech blue.
        brand: {
          50:  '#fdf8ed',
          100: '#faefd3',
          200: '#f3dba0',
          300: '#e9c06c',
          400: '#dca83f',
          500: '#c8912a',
          600: '#a8741f',
          700: '#85591b',
          800: '#634219',
          900: '#453017',
          950: '#2a1c0d',
        },
        surface: {
          DEFAULT: '#0a0a0a',
          card:    '#141210',
          border:  '#2a241d',
          muted:   '#211c16',
        },
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0f2a2a',
          light: '#1a3c3c',
          hover: '#1e4545',
        },
        accent: {
          DEFAULT: '#3d7a6e',
          hover: '#2d5e55',
        },
        gold: {
          DEFAULT: '#c9a84c',
          light: '#d4b86a',
        },
        background: '#f5f0eb',
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}


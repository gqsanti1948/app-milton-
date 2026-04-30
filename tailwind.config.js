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
          DEFAULT: '#112233',
          light: '#1c3352',
          hover: '#243d61',
        },
        accent: {
          DEFAULT: '#4a90a4',
          hover: '#357a8f',
        },
        gold: {
          DEFAULT: '#c8784a',
          light: '#d98f65',
        },
        background: '#f0f4f7',
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}


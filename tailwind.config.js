/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./index.tsx",
    "./App.tsx",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#faf9f7',
          100: '#f5f1ed',
          200: '#e8dfd6',
          300: '#d4bfa0',
          400: '#b8936f',
          500: '#8b6f47',
          600: '#6b5637',
          700: '#5a4a2f',
          800: '#4a3c27',
          900: '#3a2e1f',
        },
      },
    },
  },
  plugins: [],
}

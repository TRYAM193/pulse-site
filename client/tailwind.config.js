/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#080c14',
          card: 'rgba(255, 255, 255, 0.04)',
          accent: '#6366f1',
          purple: '#a855f7'
        }
      }
    },
  },
  plugins: [],
}

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
          dark: '#090e17',
          card: '#111827',
          surface: '#1e293b',
          border: '#334155',
          critical: '#ef4444',
          high: '#f97316',
          moderate: '#eab308',
          low: '#10b981',
          accent: '#0284c7',
          quantum: '#8b5cf6'
        }
      }
    },
  },
  plugins: [],
}

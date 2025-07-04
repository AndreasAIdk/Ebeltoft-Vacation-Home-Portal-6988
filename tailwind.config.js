/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'ebeltoft-blue': '#2563eb',
        'ebeltoft-light': '#dbeafe',
        'ebeltoft-dark': '#1e40af',
        'summer-yellow': '#fbbf24',
        'summer-green': '#10b981',
      },
      fontFamily: {
        'danish': ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
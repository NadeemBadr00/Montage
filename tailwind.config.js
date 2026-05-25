/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./editor.html",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#6366f1',
      }
    },
  },
  plugins: [],
}

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
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#b9dffd',
          300: '#7cc4fa',
          400: '#36a5f4',
          500: '#0c87e3',
          600: '#026bc1',
          700: '#03559d',
          800: '#074880',
          900: '#0c3d6b',
        },
      },
    },
  },
  plugins: [],
}

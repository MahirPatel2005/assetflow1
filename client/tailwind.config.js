/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#dbe6fe",
          500: "#3b6fed",
          600: "#2e57d1",
          700: "#2545a8",
        },
      },
    },
  },
  plugins: [],
};

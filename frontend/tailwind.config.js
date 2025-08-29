/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",   // For App Router pages/components
    "./pages/**/*.{js,ts,jsx,tsx}", // In case you also have pages directory
    "./components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: "#1D4ED8",   // Example custom color
        secondary: "#9333EA",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        heading: ["Poppins", "sans-serif"]
      },
    },
  },
  plugins: [],
};

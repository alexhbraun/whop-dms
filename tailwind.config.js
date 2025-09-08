/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class", // Enable dark mode based on the 'class' attribute
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}", // Include App Router files
  ],
  theme: {
    extend: {
      fontFamily: {
        inter: ['var(--font-inter)'],
      },
      colors: {
        brand: {
          red: "#DC2828",
          orange: "#FF8232",
          coral: "#FF6B6B",
          amber: "#FFB347",
          peach: "#FFD9C0",
          white: "#FFFFFF",
          gray: "#F5F5F5",
          charcoal: "#222222",
        },
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(90deg, #FF8232 0%, #DC2828 100%)",
      },
      boxShadow: {
        "glass": "0 10px 30px rgba(0,0,0,0.08)",
      },
      keyframes: {
        noise: {
          '0%, 100%': { transform: 'translate(0,0)' },
          '10%': { transform: 'translate(-5%,-10%)' },
          '20%': { transform: 'translate(-15%,5%)' },
          '30%': { transform: 'translate(7%,-25%)' },
          '40%': { transform: 'translate(-5%,25%)' },
          '50%': { transform: 'translate(-15%,10%)' },
          '60%': { transform: 'translate(20%,0)' },
          '70%': { transform: 'translate(0,15%)' },
          '80%': { transform: 'translate(-5%,-20%)' },
          '90%': { transform: 'translate(10%,5%)' },
        },
      },
      animation: {
        noise: 'noise 10s infinite alternate',
      },
    },
  },
  plugins: [],
};


/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'space-dark': '#0f0c29',
        'space-mid': '#302b63',
        'space-light': '#24243e',
        'purple-primary': '#667eea',
        'purple-secondary': '#764ba2',
      },
      backgroundImage: {
        'space-gradient': 'linear-gradient(to bottom, #0f0c29, #302b63, #24243e)',
        'purple-gradient': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'text-gradient': 'linear-gradient(45deg, #fff, #a8b5ff)',
      },
      backdropBlur: {
        'xs': '2px',
      },
    },
  },
  plugins: [],
}

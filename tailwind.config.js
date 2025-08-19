/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'display': ['Orbitron', 'monospace'],
        'scoreboard': ['Orbitron', 'monospace'],
      },
      colors: {
        'scoreboard': {
          'primary': '#1e40af',
          'secondary': '#dc2626',
          'accent': '#facc15',
        },
      },
      animation: {
        'servingPulse': 'servingPulse 2s infinite',
        'scoreChange': 'scoreChange 0.5s ease-out',
        'teamWin': 'teamWin 1s ease-in-out infinite',
      },
      keyframes: {
        servingPulse: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.7', transform: 'scale(1.05)' },
        },
        scoreChange: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.2)' },
          '100%': { transform: 'scale(1)' },
        },
        teamWin: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.1)' },
        },
      },
    },
  },
  plugins: [],
}


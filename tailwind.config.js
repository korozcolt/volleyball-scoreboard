/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      animation: {
        'score-bounce': 'score-bounce 0.6s ease-in-out',
        'set-win': 'set-win 1s ease-in-out',
        'serve-pulse': 'serve-pulse 2s infinite',
        'slide-in': 'slide-in 0.5s ease-out',
        'fade-in': 'fade-in 0.3s ease-in',
        'scale-in': 'scale-in 0.4s ease-out',
        'shimmer': 'shimmer 2s infinite',
      },
      keyframes: {
        'score-bounce': {
          '0%, 20%, 50%, 80%, 100%': { transform: 'translateY(0)' },
          '40%': { transform: 'translateY(-10px)' },
          '60%': { transform: 'translateY(-5px)' },
        },
        'set-win': {
          '0%, 100%': { transform: 'scale(1)' },
          '25%': { transform: 'scale(1.1) rotate(-2deg)' },
          '75%': { transform: 'scale(1.1) rotate(2deg)' },
        },
        'serve-pulse': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.7', transform: 'scale(1.05)' },
        },
        'slide-in': {
          from: { transform: 'translateX(-100%)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'scale-in': {
          from: { transform: 'scale(0)', opacity: '0' },
          to: { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '0%': { left: '-100%' },
          '100%': { left: '100%' },
        },
      },
      colors: {
        volleyball: {
          primary: '#2563eb',
          secondary: '#dc2626',
          accent: '#f59e0b',
          dark: '#1f2937',
          light: '#f8fafc',
        },
      },
      fontFamily: {
        display: ['Arial Black', 'Arial', 'sans-serif'],
        scoreboard: ['Impact', 'Arial Black', 'sans-serif'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}

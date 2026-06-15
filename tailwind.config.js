/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        broadcast: {
          background: '#031427',
          surface: '#031427',
          'surface-lowest': '#000f21',
          'surface-low': '#0b1c30',
          'surface-container': '#102034',
          'surface-high': '#1b2b3f',
          'surface-highest': '#26364a',
          outline: '#45464d',
          text: '#d3e4fe',
          muted: '#c6c6cd',
          accent: '#7bd0ff',
          alert: '#ffb2b7',
          danger: '#ee3a5a',
        },
      },
    },
  },
  plugins: [],
}

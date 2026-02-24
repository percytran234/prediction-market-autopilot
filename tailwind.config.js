/** @type {import('tailwindcss').Config} */
export default {
  content: ['./client/index.html', './client/src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0a0f0a',
          card: '#111a12',
          border: '#1e3320',
          text: '#e8f5e9',
          muted: '#4a7a4e',
          hover: '#152416',
        },
        accent: {
          green: '#00e676',
          red: '#ff1744',
          blue: '#3b82f6',
          yellow: '#ff9100',
          orange: '#00e676', // alias → green (backward compat)
        },
      },
    },
  },
  plugins: [],
};

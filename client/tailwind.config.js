/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0f1117',
          card: '#1a1d29',
          border: '#2a2d3a',
          text: '#e1e4eb',
          muted: '#8b8fa3',
        },
        accent: {
          green: '#22c55e',
          red: '#ef4444',
          blue: '#3b82f6',
          yellow: '#eab308',
        },
      },
    },
  },
  plugins: [],
};

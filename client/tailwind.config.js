/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0a0a0f',
          card: '#111118',
          border: '#1e1e2e',
          text: '#e2e8f0',
          muted: '#6b7280',
          hover: '#1a1a28',
        },
        accent: {
          green: '#00ff88',
          red: '#ff3333',
          orange: '#ff6600',
          blue: '#3b82f6',
          yellow: '#eab308',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};

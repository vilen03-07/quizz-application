/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"Space Mono"', '"IBM Plex Mono"', 'monospace'],
      },
      colors: {
        surface: {
          950: '#07080a',
          900: '#0c0d12',
          850: '#12141b',
          800: '#171922',
          700: '#222530',
          600: '#2e3240',
        },
        border: {
          subtle: '#1e212b',
          strong: '#323746',
          bright: '#4f566b',
        },
        signal: {
          blue: '#3b82f6',
          accent: '#2563eb',
          amber: '#f59e0b',
          red: '#ef4444',
          green: '#10b981',
        }
      },
      letterSpacing: {
        tighter: '-0.04em',
        tight: '-0.02em',
        widest: '0.15em',
      }
    },
  },
  plugins: [],
}

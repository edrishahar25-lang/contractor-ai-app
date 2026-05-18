/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0f1b2d',
          light: '#1a2d4a',
          mid: '#162236',
          50: '#f0f4f8',
        },
        gold: {
          DEFAULT: '#d4a017',
          light: '#f0c040',
          bright: '#ffd166',
          dark: '#9e7c1a',
          50: '#fdf8ec',
          100: '#faf0cc',
        },
        obsidian: {
          950: '#020810',
          900: '#04101f',
          850: '#061628',
          800: '#091e34',
          750: '#0d2540',
          700: '#112c4c',
          600: '#163656',
        },
      },
      fontFamily: {
        sans: ['Heebo', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      minHeight: {
        '12': '3rem',
      },
      boxShadow: {
        card: '0 2px 16px rgba(0,0,0,0.1), 0 1px 4px rgba(0,0,0,0.08)',
        'card-md': '0 8px 32px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.1)',
        'card-lg': '0 20px 60px rgba(0,0,0,0.22), 0 4px 16px rgba(0,0,0,0.12)',
        'card-hover': '0 16px 48px rgba(0,0,0,0.18), 0 4px 12px rgba(0,0,0,0.1)',
        'glow-gold': '0 0 24px rgba(212,160,23,0.55), 0 0 48px rgba(212,160,23,0.2)',
        'glow-gold-sm': '0 0 12px rgba(212,160,23,0.5)',
        'glow-gold-btn': '0 6px 24px rgba(212,160,23,0.45)',
        'glow-blue': '0 0 20px rgba(79,142,247,0.45)',
        'glow-green': '0 0 16px rgba(34,197,94,0.4)',
        'glow-purple': '0 0 16px rgba(168,85,247,0.35)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}

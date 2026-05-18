/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
          DEFAULT: '#0d9488',
        },
        orange: {
          DEFAULT: '#f97316',
          light: '#fb923c',
          dark: '#ea580c',
        },
        navy: {
          DEFAULT: '#0f172a',
          light: '#1e293b',
          50: '#f8fafc',
        },
        // Keep gold for proposal/print use
        gold: {
          DEFAULT: '#d4a017',
          light: '#f0c040',
          50: '#fdf8ec',
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
        card:      '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
        'card-md': '0 4px 24px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.05)',
        'card-lg': '0 12px 40px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)',
        'card-hover': '0 8px 32px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.06)',
        'glow-teal':  '0 0 20px rgba(13,148,136,0.4), 0 0 40px rgba(13,148,136,0.15)',
        'glow-teal-sm': '0 0 12px rgba(13,148,136,0.35)',
        'glow-teal-btn': '0 6px 24px rgba(13,148,136,0.4)',
        // Legacy (used in blueprint/proposal)
        'glow-gold': '0 0 20px rgba(212,160,23,0.4)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}

/** @type {import('tailwindcss').Config} */
export default {
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
          DEFAULT: '#c9a227',
          light: '#e8b93a',
          dark: '#9e7c1a',
          50: '#fdf8ec',
          100: '#faf0cc',
        },
      },
      fontFamily: {
        sans: ['Heebo', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      minHeight: {
        '12': '3rem',
      },
      boxShadow: {
        card: '0 2px 8px rgba(0,0,0,0.08)',
        'card-md': '0 4px 20px rgba(0,0,0,0.12)',
        'card-lg': '0 8px 40px rgba(0,0,0,0.16)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}

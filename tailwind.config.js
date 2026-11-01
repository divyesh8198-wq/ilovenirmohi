/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: { 50: '#fefef9', 100: '#fdf8f0', 200: '#faf0e0', 300: '#f5e6cc', DEFAULT: '#fdf8f0' },
        blush: { 50: '#fff0f5', 100: '#ffe0ee', 200: '#ffc2dc', 300: '#ff9ec7', 400: '#f472b6', 500: '#ec4899', DEFAULT: '#f472b6' },
        rose: { wine: '#be185d', deep: '#9d174d', soft: '#f9a8d4' },
        lavender: { 50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd', 400: '#a78bfa', 500: '#8b5cf6', DEFAULT: '#c4b5fd' },
        kitty: { pink: '#f9a8d4', red: '#f43f5e', bow: '#e11d48' },
        kuromi: { dark: '#1c1917', purple: '#7c3aed', light: '#ede9fe' },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['"Lato"', 'sans-serif'],
        handwriting: ['"Dancing Script"', 'cursive'],
      },
      boxShadow: {
        polaroid: '0 4px 20px rgba(0,0,0,0.12), 0 0 0 8px white, 0 4px 28px rgba(0,0,0,0.1)',
        soft: '0 4px 24px rgba(244,114,182,0.12)',
        glow: '0 0 24px rgba(244,114,182,0.35)',
        kawaii: '0 4px 20px rgba(244,114,182,0.25), 0 0 0 2px rgba(244,114,182,0.1)',
        kuromi: '0 4px 20px rgba(124,58,237,0.25), 0 0 0 2px rgba(124,58,237,0.1)',
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'heartbeat': 'heartbeat 1.5s ease-in-out infinite',
        'twinkle': 'twinkle 2s ease-in-out infinite',
        'slide-up': 'slideUp 0.4s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'wiggle': 'wiggle 0.5s ease-in-out infinite',
        'bounce-soft': 'bounceSoft 2s ease-in-out infinite',
        'spin-slow': 'spin 4s linear infinite',
      },
      keyframes: {
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
        heartbeat: { '0%,100%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.15)' } },
        twinkle: { '0%,100%': { opacity: '0.4', transform: 'scale(0.9)' }, '50%': { opacity: '1', transform: 'scale(1.1)' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(20px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        wiggle: { '0%,100%': { transform: 'rotate(-3deg)' }, '50%': { transform: 'rotate(3deg)' } },
        bounceSoft: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
      },
    },
  },
  plugins: [],
};

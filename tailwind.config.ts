import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './client/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#081C35',
        teal: '#0E9F9A',
        mist: '#E8F3FC',
        mint: '#D9F6EF',
        amber: '#FFF0C2',
        rose: '#FCE1E0',
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;

import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── Brand palette ──────────────────────────────────────────────────
        navy: {
          DEFAULT: '#1B3A5C',
          50:  '#EBF1F8',
          100: '#C8D9ED',
          200: '#91AED5',
          300: '#5A83BC',
          400: '#2F5E99',
          500: '#1B3A5C',
          600: '#152E49',
          700: '#0E2235',
          800: '#071622',
          900: '#030B11',
        },
        gold: {
          DEFAULT: '#C8962E',
          50:  '#FBF3E1',
          100: '#F4DFA9',
          200: '#EACA72',
          300: '#DFB53A',
          400: '#C8962E',
          500: '#A87825',
          600: '#875B1B',
          700: '#663F12',
          800: '#452409',
          900: '#240901',
        },
        teal: {
          DEFAULT: '#2A7F6F',
          50:  '#E4F4F1',
          100: '#B4E2DA',
          200: '#7ECEC2',
          300: '#49BAA9',
          400: '#2A7F6F',
          500: '#216659',
          600: '#184D43',
          700: '#10342D',
          800: '#071C17',
          900: '#030E0B',
        },
        // ── Background layers ──────────────────────────────────────────────
        bg: {
          base:   '#0A1628',
          card:   '#0F1E35',
          raised: '#152540',
          border: '#1E3451',
          input:  '#0F1E35',
        },
        // ── Text ───────────────────────────────────────────────────────────
        text: {
          primary:   '#F1F5F9',
          secondary: '#CBD5E1',
          muted:     '#94A3B8',
          subtle:    '#64748B',
          dim:       '#3B5068',
        },
        // ── Semantic ───────────────────────────────────────────────────────
        positive: '#4ADE80',
        negative: '#F87171',
        warning:  '#FBBF24',
      },
      fontFamily: {
        sans: ['Inter', 'DM Sans', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0,0,0,0.4), 0 1px 2px -1px rgba(0,0,0,0.4)',
        'card-hover': '0 4px 12px 0 rgba(0,0,0,0.5)',
        glow: '0 0 20px rgba(200,150,46,0.15)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'navy-gradient': 'linear-gradient(135deg, #0A1628 0%, #0F1E35 100%)',
      },
    },
  },
  plugins: [],
}

export default config

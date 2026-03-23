import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Dark navy palette matching the artifact
        bg: {
          base: '#060b14',
          card: '#0c1626',
          header: '#080e1a',
          border: '#1e293b',
          muted: '#0f172a',
        },
        text: {
          primary: '#f1f5f9',
          secondary: '#e2e8f0',
          muted: '#94a3b8',
          subtle: '#64748b',
          faint: '#475569',
          dim: '#334155',
        },
        accent: {
          blue: '#38bdf8',
          amber: '#f59e0b',
          green: '#4ade80',
          red: '#f87171',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;

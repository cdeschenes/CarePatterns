import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // These map to CSS custom properties set by the active theme.
        // Values are stored as RGB triplets ("R G B") to enable Tailwind's
        // opacity modifier syntax: bg-cp-primary/10, text-cp-text/50, etc.
        // Usage: bg-cp-bg, text-cp-text, bg-cp-primary, border-cp-border, etc.
        'cp-bg':         'rgb(var(--color-bg) / <alpha-value>)',
        'cp-surface':    'rgb(var(--color-surface) / <alpha-value>)',
        'cp-text':       'rgb(var(--color-text) / <alpha-value>)',
        'cp-text-muted': 'rgb(var(--color-text-muted) / <alpha-value>)',
        'cp-primary':    'rgb(var(--color-primary) / <alpha-value>)',
        'cp-accent':     'rgb(var(--color-accent) / <alpha-value>)',
        'cp-border':     'rgb(var(--color-border) / <alpha-value>)',
        'cp-danger':     'rgb(var(--color-danger) / <alpha-value>)',
      },
    },
  },
  plugins: [],
}

export default config

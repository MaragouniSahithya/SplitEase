/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: 'var(--primary-50)',
          100: 'var(--primary-100)',
          500: 'var(--primary-500)',
          600: 'var(--primary-600)',
          700: 'var(--primary-700)'
        },
        accent: {
          400: 'var(--accent-400)',
          500: 'var(--accent-500)'
        },
        bg: {
          base: 'var(--bg-base)',
          card: 'var(--bg-card)',
          surface: 'var(--bg-surface)'
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)'
        },
        status: {
          success: 'var(--success)',
          warning: 'var(--warning)',
          danger: 'var(--danger)',
          info: 'var(--info)'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03)',
        hover: '0 8px 32px rgba(0,0,0,0.1)',
        button: '0 2px 8px rgba(20,184,166,0.3), inset 0 1px 0 rgba(255,255,255,0.15)'
      }
    },
  },
  plugins: [],
}

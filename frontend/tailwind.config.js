/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        base: {
          DEFAULT: '#0A0A0C',
          surface: '#161618',
          raised: '#1E1E21',
          border: '#2A2A2E',
        },
        ink: {
          DEFAULT: '#E8E8EA',
          muted: '#8A8A8E',
          faint: '#5A5A5E',
        },
        accent: {
          DEFAULT: '#0A84FF',
          dim: '#0A84FF33',
        },
        success: {
          DEFAULT: '#30D158',
          dim: '#30D15833',
        },
        danger: {
          DEFAULT: '#FF453A',
          dim: '#FF453A33',
        },
        warn: {
          DEFAULT: '#FFD60A',
          dim: '#FFD60A33',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      keyframes: {
        'scan-rotate': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.95)', opacity: '0.7' },
          '70%': { transform: 'scale(1.05)', opacity: '0.15' },
          '100%': { transform: 'scale(0.95)', opacity: '0.7' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'scan-rotate': 'scan-rotate 2.2s linear infinite',
        'pulse-ring': 'pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fade-in 0.25s ease-out',
        'fade-in-up': 'fade-in-up 0.35s ease-out',
      },
    },
  },
  plugins: [],
}

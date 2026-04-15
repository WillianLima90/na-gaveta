// ============================================================
// Na Gaveta — Tailwind CSS Config
// Paleta esportiva escura com tons laranja e verde
// ============================================================

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Fundos
        'bg-primary': '#0F0F10',
        'bg-card': '#18181B',
        'bg-elevated': '#1F1F23',

        // Marca
        'brand': '#F97316',
        'brand-light': '#FB923C',
        'brand-dark': '#EA6C10',

        // Status
        'live': '#22C55E',
        'live-dark': '#16A34A',

        // Texto
        'text-primary': '#E5E7EB',
        'text-secondary': '#A1A1AA',
        'text-muted': '#71717A',

        // Bordas
        'border-subtle': '#27272A',
        'border-default': '#3F3F46',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #F97316 0%, #FB923C 100%)',
        'gradient-dark': 'linear-gradient(180deg, #0F0F10 0%, #18181B 100%)',
        'gradient-hero': 'linear-gradient(135deg, #0F0F10 0%, #1a0a00 50%, #0F0F10 100%)',
      },
      animation: {
        'pulse-live': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      boxShadow: {
        'brand': '0 0 20px rgba(249, 115, 22, 0.3)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.5)',
        'elevated': '0 10px 25px -3px rgba(0, 0, 0, 0.6)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
};

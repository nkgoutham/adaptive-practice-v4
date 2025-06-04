/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#F0F7FF',
          100: '#E0EFFF',
          200: '#B8DCFF',
          300: '#8AC8FF',
          400: '#47ABFF',
          500: '#0090FF', // Sky blue primary
          600: '#0072CC',
          700: '#005699',
          800: '#003B66',
          900: '#001D33',
        },
        secondary: {
          50: '#F9F5F2',
          100: '#F3EBE5',
          200: '#E6D7CC',
          300: '#D9C3B2',
          400: '#CCAF99',
          500: '#BF9B7F', // Bronze secondary
          600: '#A67C5C',
          700: '#8C5E39',
          800: '#593F26',
          900: '#2C1F13',
        },
        accent: {
          50: '#F7FAFC',
          100: '#EFF5F9',
          200: '#DFEAF3',
          300: '#C0D6E7',
          400: '#A1C1DA',
          500: '#82ADCE',
          600: '#5E91B5',
          700: '#3A749C',
          800: '#255275',
          900: '#132F42',
        },
        success: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          500: '#10B981',
          700: '#047857',
        },
        warning: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          500: '#F59E0B',
          700: '#B45309',
        },
        error: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          500: '#EF4444',
          700: '#B91C1C',
        },
        neutral: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
        },
      },
      boxShadow: {
        'soft': '0 8px 30px rgba(0, 0, 0, 0.05)',
        'medium': '0 8px 30px rgba(0, 0, 0, 0.1)',
        'strong': '0 12px 40px rgba(0, 0, 0, 0.15)',
        '3d': '0 20px 60px -10px rgba(0, 0, 0, 0.1), 0 10px 20px -10px rgba(0, 0, 0, 0.04)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      animation: {
        'bounce-gentle': 'bounce-gentle 1.5s infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fade-in 0.5s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
      },
      keyframes: {
        'bounce-gentle': {
          '0%, 100%': { transform: 'translateY(-5%)' },
          '50%': { transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
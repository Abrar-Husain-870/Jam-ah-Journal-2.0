/** @type {import('tailwindcss').Config} */

module.exports = {

  darkMode: 'class',

  content: ['./src/**/*.{js,jsx,ts,tsx}'],

  theme: {

    extend: {

      colors: {

        primary: {

          50: '#f0f9ff',

          100: '#e0f2fe',

          200: '#bae6fd',

          300: '#7dd3fc',

          400: '#38bdf8',

          500: '#0ea5e9',

          600: '#0284c7',

          700: '#0369a1',

          800: '#075985',

          900: '#0c4a6e',

        },

        jj: {

          canvas: '#f3f2ef',

          'canvas-dark': '#090807',

          mist: '#ebe8e3',

          'mist-dark': '#1c1b18',

          surface: '#fcfaf7',

          'surface-2': '#f7f5f0',

          'surface-dark': '#121110',

          'surface-dark-2': '#1a1916',

          'elevated-dark': '#1f1e1b',

          ink: '#1c1917',

          'ink-muted': '#57534e',

          muted: '#78716c',

          border: '#e2ddd4',

          'border-dark': 'rgba(255,255,255,0.07)',

          accent: '#0d6d63',

          'accent-soft': '#0f766e',

          'accent-dark': '#2dd4bf',

          gold: '#8f7a5e',

        },

        islamic: {

          green: '#22c55e',

          gold: '#f59e0b',

          blue: '#3b82f6',

        },

      },

      fontFamily: {

        sans: [

          '"Plus Jakarta Sans"',

          'Inter',

          'system-ui',

          '-apple-system',

          'Segoe UI',

          'sans-serif',

        ],

        arabic: ['Amiri', 'serif'],

      },

      fontSize: {

        '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.02em' }],

      },

      letterSpacing: {

        cap: '0.16em',

        'cap-wide': '0.18em',

      },

      borderRadius: {

        jj: '1.125rem',

        'jj-lg': '1.375rem',

        'jj-xl': '1.625rem',

      },

      boxShadow: {

        jj: '0 1px 0 rgba(28,25,23,0.04), 0 20px 50px -18px rgba(28,25,23,0.09)',

        'jj-dark': '0 1px 0 rgba(255,255,255,0.04), 0 24px 56px -16px rgba(0,0,0,0.65)',

        'jj-card':

          '0 1px 0 rgba(28,25,23,0.05), 0 12px 32px -14px rgba(28,25,23,0.07)',

        'jj-card-dark':

          '0 1px 0 rgba(255,255,255,0.05), 0 16px 40px -12px rgba(0,0,0,0.55)',

        'jj-nav': '0 1px 0 rgba(28,25,23,0.06)',

        'jj-nav-dark': '0 1px 0 rgba(255,255,255,0.06)',

        'jj-inset': 'inset 0 1px 0 rgba(255,255,255,0.45)',

        'jj-inset-dark': 'inset 0 1px 0 rgba(255,255,255,0.06)',

      },

      spacing: {

        4.5: '1.125rem',

        13: '3.25rem',

        15: '3.75rem',

        18: '4.5rem',

      },

      transitionDuration: {

        jj: '180ms',

        'jj-page': '240ms',

      },

      transitionTimingFunction: {

        'jj-out': 'cubic-bezier(0.22, 1, 0.36, 1)',

      },

    },

  },

  plugins: [],

};


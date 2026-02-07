import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Canonical brand orange scale (used as both `reddit-*` and `primary-*`)
        // `primary` is an alias kept for backwards compat with builder components.
        primary: {
          50: '#fff4ed',
          100: '#ffe4d5',
          200: '#ffc9aa',
          300: '#ffa775',
          400: '#ff7a3d',
          500: '#FF4500', // Reddit Orange
          600: '#db3700',
          700: '#b62d00',
          800: '#912400',
          900: '#701c00',
        },
        // Reddit blue for links and secondary actions
        secondary: {
          50: '#e6f4ff',
          100: '#b3dfff',
          200: '#80caff',
          300: '#4db5ff',
          400: '#1a9fff',
          500: '#0079D3', // Reddit Blue
          600: '#0066b3',
          700: '#005299',
          800: '#003d73',
          900: '#00294d',
        },
        // Green for success/upvotes
        accent: {
          50: '#e6fff2',
          100: '#b3ffd9',
          200: '#80ffc0',
          300: '#4dffa7',
          400: '#1aff8e',
          500: '#46D160', // Reddit green
          600: '#3ab852',
          700: '#2e9f44',
          800: '#228636',
          900: '#166d28',
        },
        // Reddit orange (main brand color) - canonical reference
        reddit: {
          DEFAULT: '#FF4500',
          light: '#FF5722',
          dark: '#CC3700',
          50: '#fff4ed',
          100: '#ffe4d5',
          200: '#ffc9aa',
          300: '#ffa775',
          400: '#ff7a3d',
          500: '#FF4500',
          600: '#db3700',
          700: '#b62d00',
          800: '#912400',
          900: '#701c00',
        },
        // Reddit's UI grays - monotonic lightness scale (50 lightest -> 900 darkest)
        'reddit-gray': {
          50: '#F8F9FA',   // Lightest
          100: '#EDEFF1',  // Light background
          200: '#DAE0E6',  // Reddit feed background
          300: '#C8CBCD',  // Borders
          400: '#878A8C',  // Muted text
          500: '#7C7C7C',  // Secondary text
          600: '#5A5A5A',  // Body text
          700: '#343536',  // Reddit dark card
          800: '#272729',  // Dark surface
          900: '#1A1A1B',  // Reddit dark background
        },
        // Trust color for verification badges (alias of accent)
        trust: {
          DEFAULT: '#46D160',
          50: '#e6fff2',
          100: '#b3ffd9',
          200: '#80ffc0',
          300: '#4dffa7',
          400: '#1aff8e',
          500: '#46D160',
          600: '#3ab852',
          700: '#2e9f44',
          800: '#228636',
          900: '#166d28',
        },
        // Extended slate for dark UI elements
        slate: {
          950: '#0f172a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        script: ['Satisfy', 'cursive'],
      },
      borderRadius: {
        xl: '16px',
        '2xl': '24px',
      },
      boxShadow: {
        soft: '0 4px 20px rgba(0, 0, 0, 0.08)',
        hover: '0 8px 30px rgba(0, 0, 0, 0.12)',
        'reddit': '0 2px 4px 0 rgba(28,28,28,0.2)',
        'reddit-hover': '0 4px 8px 0 rgba(28,28,28,0.2)',
      },
      backgroundImage: {
        // Reddit-inspired gradients
        'gradient-reddit': 'linear-gradient(135deg, #FF4500 0%, #FF5722 100%)',
        'gradient-reddit-dark': 'linear-gradient(135deg, #1A1A1B 0%, #272729 100%)',
        'gradient-sunset': 'linear-gradient(135deg, #FF4500 0%, #ff7a3d 50%, #ffc9aa 100%)',
        'gradient-ocean': 'linear-gradient(180deg, #0079D3 0%, #005299 100%)',
      },
      // Semantic z-index scale to prevent stacking conflicts
      // Use these instead of arbitrary z-values for consistency
      zIndex: {
        'base': '0',
        'dropdown': '10',     // Dropdowns, autocomplete lists
        'sticky': '20',       // Sticky headers within sections
        'fixed': '30',        // Fixed navigation, footers
        'drawer': '40',       // Side drawers, panels
        'modal': '50',        // Modal dialogs
        'overlay': '60',      // Overlays above modals (nested modals)
        'popover': '70',      // Popovers, tooltips above modals
        'toast': '100',       // Toast notifications (always on top)
      },
      // Default transition timing for consistent feel across the app
      transitionTimingFunction: {
        'ease-out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      transitionDuration: {
        DEFAULT: '200ms',
      },
      animation: {
        'shimmer': 'shimmer 2s infinite linear',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.15s ease-out',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;

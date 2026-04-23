/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ios: {
          blue: '#007AFF',
          gray: '#1C1C1E',
          gray2: '#2C2C2E',
          gray3: '#3A3A3C',
          gray4: '#48484A',
          gray5: '#636366',
          gray6: '#8E8E93',
          separator: '#38383A',
          label: '#FFFFFF',
          secondaryLabel: '#8E8E93',
          tertiaryLabel: '#48484A',
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Segoe UI', 'sans-serif'],
      },
      borderRadius: {
        ios: '12px',
      },
      minHeight: {
        touch: '44px',
      },
      minWidth: {
        touch: '44px',
      }
    },
  },
  plugins: [],
}

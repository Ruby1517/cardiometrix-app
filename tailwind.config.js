/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cmx: {
          bg: '#FFFFFF',
          text: '#0F172A',
          line: '#E5E7EB',
          primary: '#0D9488',
          primaryHover: '#0F766E',
          accent: '#059669',
          info: '#4F46E5',
          risk: {
            green: '#16A34A',
            amber: '#F59E0B',
            red: '#DC2626',
          }
        }
      },
      borderRadius: {
        card: '1rem'
      },
      boxShadow: {
        soft: '0 6px 24px rgba(2, 44, 34, 0.06)'
      }
    }
  },
  plugins: []
};

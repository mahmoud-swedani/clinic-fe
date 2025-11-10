// tailwind.config.ts
import rtl from 'tailwindcss-rtl'

export default {
  content: [
    './src/**/*.{js,ts,jsx,tsx}', // حسب مشروعك
  ],
  theme: {
    extend: {},
  },
  plugins: [rtl()],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}',
  ],
  // The SHRAMIK global shell owns resets and typography. Keep Tailwind utilities only.
  corePlugins: { preflight: false },
  theme: { extend: {} },
  plugins: [],
};

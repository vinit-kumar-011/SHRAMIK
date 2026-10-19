/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}',
    '../../SHRAMIK_Emerging_Skills_React_Integrated/SHRAMIK_Emerging_Skills_React_Integrated/src/pages/EmergingSkillsPage.tsx',
  ],
  // The SHRAMIK global shell owns resets and typography. Keep Tailwind utilities only.
  corePlugins: { preflight: false },
  theme: { extend: {} },
  plugins: [],
};

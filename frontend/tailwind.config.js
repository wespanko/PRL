/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  // Important: Tailwind is scoped to the experimental cyberpunk page only.
  // Existing components use plain CSS / brief tokens and are untouched.
  // Prefix avoidance: we don't add a prefix because Tailwind utilities
  // don't collide with the project's `.pk-*` / `.diff-*` / `.opt-*` etc.
  theme: { extend: {} },
  plugins: [],
};

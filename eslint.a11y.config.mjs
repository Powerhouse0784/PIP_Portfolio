// Accessibility lint: `npm run lint:a11y`. A separate config on purpose, so it never changes what `next build` does.
import jsxA11y from "eslint-plugin-jsx-a11y";
import tsParser from "@typescript-eslint/parser";

// The source has inline `eslint-disable` comments for Next.js / React-hooks rules that this a11y-only config does not load; these no-op
// stand-ins keep ESLint from reporting those comments as unknown rules.
const noop = { create: () => ({}) };
const stubs = {
  "@next/next": { rules: { "no-img-element": noop, "no-html-link-for-pages": noop } },
  "react-hooks": { rules: { "exhaustive-deps": noop, "rules-of-hooks": noop } },
};

export default [
  { ignores: [".next/**", "node_modules/**", "public/**", "tests/**", "scripts/**"] },
  {
    files: ["src/**/*.{ts,tsx}"],
    linterOptions: { reportUnusedDisableDirectives: "off" },
    languageOptions: { parser: tsParser, parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { "jsx-a11y": jsxA11y, ...stubs },
    rules: { ...jsxA11y.flatConfigs.recommended.rules },
  },
];

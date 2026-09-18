import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import puramaConfig from "@purama/eslint-config";

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      ".vercel/**",
      "out/**",
      "build/**",
      "dist/**",
      "node_modules/**",
      "playwright-report/**",
      "test-results/**",
      "coverage/**",
      "public/sw.js",
      "mobile/**",
      ".worktrees/**",
      "next-env.d.ts",
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  ...puramaConfig,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  {
    // Tests E2E et scripts Node : console.log = sortie de diagnostic des tests
    // eux-mêmes, pas du code applicatif (src/ reste strict : warn/error only).
    files: ["e2e/**", "scripts/**"],
    rules: {
      "no-console": "off",
    },
  },
];

export default eslintConfig;

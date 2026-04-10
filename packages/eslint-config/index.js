/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "prettier",
  ],
  plugins: ["@typescript-eslint", "import", "react", "react-hooks"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaFeatures: { jsx: true },
  },
  settings: {
    react: { version: "detect" },
  },
  rules: {
    // TypeScript
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/consistent-type-imports": [
      "warn",
      { prefer: "type-imports" },
    ],
    // React
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "off",
    // Imports
    "import/order": [
      "warn",
      {
        groups: [
          "builtin",
          "external",
          "internal",
          "parent",
          "sibling",
          "index",
        ],
        "newlines-between": "always",
        alphabetize: { order: "asc" },
      },
    ],
    "no-console": ["warn", { allow: ["warn", "error"] }],
  },
  env: {
    browser: true,
    node: true,
    es2022: true,
  },
  ignorePatterns: [
    "node_modules/",
    "dist/",
    ".next/",
    ".expo/",
    "*.config.js",
    "*.config.ts",
  ],
};

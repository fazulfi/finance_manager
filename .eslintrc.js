/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  extends: ["@finance/eslint-config"],
  ignorePatterns: [
    "node_modules/",
    "dist/",
    ".next/",
    ".expo/",
    "*.config.js",
    "*.config.ts",
    "pnpm-lock.yaml",
  ],
};

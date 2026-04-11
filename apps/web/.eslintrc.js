/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: ["@finance/eslint-config", "next/core-web-vitals"],
  parserOptions: {
    tsconfigRootDir: __dirname,
  },
};

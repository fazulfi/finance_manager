/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: ["@finance/eslint-config"],
  parserOptions: { tsconfigRootDir: __dirname },
};

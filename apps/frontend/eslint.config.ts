import { defineConfig, globalIgnores } from "eslint/config";
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import jsxA11yPlugin from "eslint-plugin-jsx-a11y";
import pluginQuery from "@tanstack/eslint-plugin-query";
import pluginRouter from "@tanstack/eslint-plugin-router";

const ignoredFiles = ["**/node_modules/**", "**/dist/**", "src/api/**", "postcss.config.cjs"];

// @see https://typescript-eslint.io/rules/no-unused-vars/#what-benefits-does-this-rule-have-over-typescript
const unusedVarsExceptUnderscored = {
  args: "all",
  argsIgnorePattern: "^_",
  caughtErrors: "all",
  caughtErrorsIgnorePattern: "^_",
  destructuredArrayIgnorePattern: "^_",
  varsIgnorePattern: "^_",
  ignoreRestSiblings: true,
};

export default defineConfig(
  globalIgnores(ignoredFiles),
  eslint.configs.recommended,
  tseslint.configs.recommended,
  tseslint.configs.strict,
  tseslint.configs.stylistic,
  reactPlugin.configs.flat.recommended,
  reactPlugin.configs.flat["jsx-runtime"],
  reactHooksPlugin.configs.flat.recommended,
  jsxA11yPlugin.flatConfigs.recommended,
  {
    settings: { react: { version: "detect" } },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", unusedVarsExceptUnderscored],
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  ...pluginQuery.configs["flat/recommended"],
  ...pluginRouter.configs["flat/recommended"],
);

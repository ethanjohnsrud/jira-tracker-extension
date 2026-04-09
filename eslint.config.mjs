import js from "@eslint/js";
import globals from "globals";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import eslintConfigPrettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

export default [
	{
		ignores: ["dist/**", "node_modules/**"],
	},
	{
		files: ["src/**/*.{js,jsx,ts,tsx}"],
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				ecmaVersion: "latest",
				sourceType: "module",
				ecmaFeatures: {
					jsx: true,
				},
			},
			globals: {
				...globals.browser,
				chrome: "readonly",
			},
		},
		plugins: {
			react: reactPlugin,
			"react-hooks": reactHooksPlugin,
			"@typescript-eslint": tseslint.plugin,
		},
		settings: {
			react: {
				version: "detect",
			},
		},
		rules: {
			...js.configs.recommended.rules,
			...reactPlugin.configs.flat.recommended.rules,
			...reactPlugin.configs.flat["jsx-runtime"].rules,
			"no-unused-vars": "warn",
			"@typescript-eslint/no-unused-vars": "warn",
			"react-hooks/rules-of-hooks": "error",
			"react-hooks/exhaustive-deps": "warn",
			"react/prop-types": "off",
		},
	},
	{
		files: ["*.js"],
		languageOptions: {
			sourceType: "commonjs",
			ecmaVersion: "latest",
			globals: globals.node,
		},
		rules: {
			...js.configs.recommended.rules,
		},
	},
	eslintConfigPrettier,
];

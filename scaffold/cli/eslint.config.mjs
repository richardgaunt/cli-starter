import js from '@eslint/js';
import globals from 'globals';
import nodePlugin from 'eslint-plugin-n';

export default [
  js.configs.recommended,
  nodePlugin.configs['flat/recommended'],
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest
      },
      ecmaVersion: 2022,
      sourceType: 'module'
    },
    rules: {
      'semi': ['error', 'always'],
      'quotes': ['error', 'single']
    }
  }
];
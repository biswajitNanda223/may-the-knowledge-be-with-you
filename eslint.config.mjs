import js from '@eslint/js';
import security from 'eslint-plugin-security';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', '**/*.test.ts'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  security.configs.recommended,
  { languageOptions: { globals: { ...globals.node, ...globals.browser } }, rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    'security/detect-object-injection': 'off'
  } }
);

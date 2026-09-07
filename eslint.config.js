import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

// Ambiente de browser + APIs Web usadas pelo app (sem dependência extra de globals).
const browserGlobals = {
  window: 'readonly', document: 'readonly', navigator: 'readonly', console: 'readonly',
  localStorage: 'readonly', fetch: 'readonly', Blob: 'readonly', URL: 'readonly',
  setTimeout: 'readonly', clearTimeout: 'readonly', setInterval: 'readonly', clearInterval: 'readonly',
  AbortController: 'readonly', crypto: 'readonly', FileReader: 'readonly', File: 'readonly',
  Event: 'readonly', KeyboardEvent: 'readonly', MouseEvent: 'readonly', DragEvent: 'readonly',
  HTMLElement: 'readonly', HTMLInputElement: 'readonly', HTMLDivElement: 'readonly',
  HTMLTextAreaElement: 'readonly', Node: 'readonly', requestAnimationFrame: 'readonly',
};

export default tseslint.config(
  { ignores: ['dist', 'dev-dist', 'node_modules', 'scripts'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: browserGlobals,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // Regras clássicas de hooks (o preset "recommended" da v7 traz rules
      // experimentais que sinalizam código correto; usamos apenas as estáveis).
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
);

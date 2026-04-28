/**
 * @fileoverview Configuración de ESLint 9 para ChatEdu Builder.
 * ESLint 9 requiere eslint.config.js (flat config). El formato anterior
 * (.eslintrc.*) ya no es compatible con esta versión.
 */

import js from '@eslint/js';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default [
  // Archivos ignorados (equivalente al antiguo .eslintignore)
  {
    ignores: ['build/**', 'dist/**', 'node_modules/**'],
  },

  // Base recomendada de ESLint
  js.configs.recommended,

  // Configuración para archivos JS/JSX del proyecto
  {
    files: ['**/*.{js,jsx}'],
    plugins: {
      react:       reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType:  'module',
      globals: {
        ...globals.browser,
        ...globals.es2022,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      // ── React ─────────────────────────────────────────────────────────────
      ...reactPlugin.configs.recommended.rules,
      'react/react-in-jsx-scope':  'off', // no necesario con React 17+ y Vite
      'react/prop-types':          'off', // proyecto sin TypeScript → desactivado
      'react/display-name':        'warn',

      // ── React Hooks ───────────────────────────────────────────────────────
      ...reactHooksPlugin.configs.recommended.rules,
      'react-hooks/rules-of-hooks':  'error',
      'react-hooks/exhaustive-deps': 'warn',

      // ── Calidad general ────────────────────────────────────────────────────
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console':     'off', // permitido — el proyecto usa console.warn/error para diagnóstico
    },
  },
];

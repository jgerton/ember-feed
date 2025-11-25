// ESLint 9 flat config for Next.js 16
import js from '@eslint/js'
import tseslint from '@typescript-eslint/eslint-plugin'
import tsparser from '@typescript-eslint/parser'
import globals from 'globals'

export default [
  // Base recommended rules
  js.configs.recommended,

  // Configuration for TypeScript files
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.node,
        ...globals.browser,
        React: 'readonly',
        JSX: 'readonly',
        NodeJS: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      // TypeScript handles unused vars better than ESLint
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      // Allow explicit any for gradual typing
      '@typescript-eslint/no-explicit-any': 'off',
      // React 19 + Next.js 16 doesn't require React import
      'react/react-in-jsx-scope': 'off',
    },
  },

  // Configuration for test files
  {
    files: ['tests/**/*.ts', 'tests/**/*.spec.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
        ok: 'readonly',
      },
    },
  },

  // Ignore patterns
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'out/**',
      'public/**',
      '.cache/**',
      'playwright-report/**',
      'test-results/**',
      '*.config.js',
      '*.config.ts',
      'coverage/**',
      'aggregator-service/**',
    ],
  },
]

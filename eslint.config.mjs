import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import nextPlugin from '@next/eslint-plugin-next'
import reactHooks from 'eslint-plugin-react-hooks'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import importX from 'eslint-plugin-import-x'
import globals from 'globals'

export default [
  // Global ignores
  { ignores: ['.next/**', 'out/**', 'build/**', 'next-env.d.ts'] },

  // Base JS recommended
  js.configs.recommended,

  // TypeScript
  ...tseslint.configs.recommended,

  // React Hooks
  reactHooks.configs.flat.recommended,
  {
    rules: {
      // Informational only — libraries (TanStack Table, React Hook Form) need updates for React Compiler
      'react-hooks/incompatible-library': 'off',
    },
  },

  // JSX A11y — configured for Shadcn/Radix component patterns
  {
    ...jsxA11y.flatConfigs.recommended,
    settings: {
      ...jsxA11y.flatConfigs.recommended.settings,
      'jsx-a11y': {
        components: {
          Label: 'label',
          Input: 'input',
          Select: 'select',
          Textarea: 'textarea',
          Button: 'button',
        },
      },
    },
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
      'jsx-a11y/label-has-associated-control': ['error', {
        controlComponents: ['Input', 'Select', 'Textarea', 'Switch', 'Checkbox'],
        depth: 3,
        assert: 'either',
      }],
    },
  },

  // Import (without typescript resolver — TS compiler handles resolution)
  importX.flatConfigs.recommended,
  {
    rules: {
      'import-x/no-unresolved': 'off',
      'import-x/namespace': 'off',
      'import-x/named': 'off',
      'import-x/no-named-as-default': 'off',
      'import-x/no-named-as-default-member': 'off',
    },
  },

  // Next.js
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: { '@next/next': nextPlugin },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
    },
  },

  // Globals
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },

  // Test files — relax rules
  {
    files: ['**/__tests__/**', '**/*.test.*'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@next/next/no-assign-module-variable': 'off',
    },
  },
]

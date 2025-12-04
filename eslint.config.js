import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';
import prettierPlugin from 'eslint-plugin-prettier';
import reactPlugin from 'eslint-plugin-react';
import reactCompilerPlugin from 'eslint-plugin-react-compiler';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

export default [
  js.configs.recommended,
  {
    ignores: [
      'node_modules',
      'build',
      'public',
      'coverage',
      '.github',
      'automation',
      'vercel-build.ts',
      '.prettierrc.cjs',
      '.eslintrc.cjs',
      'vite.config.js',
      'vitest.config.ts',
      'eslint.config.js',
    ],
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        project: './tsconfig.json',
      },
      globals: {
        document: 'readonly',
        navigator: 'readonly',
        window: 'readonly',
        console: 'readonly',
        process: 'readonly',
        module: 'readonly',
        __dirname: 'readonly',
        require: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        React: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLSelectElement: 'readonly',
        HTMLButtonElement: 'readonly',
        HTMLDivElement: 'readonly',
        HTMLSpanElement: 'readonly',
        MouseEvent: 'readonly',
        DragEvent: 'readonly',
        EventListener: 'readonly',
        MediaQueryListEvent: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        Request: 'readonly',
        structuredClone: 'readonly',
        ServiceWorkerGlobalScope: 'readonly',
        ExtendableMessageEvent: 'readonly',
        sessionStorage: 'readonly',
        SVGSVGElement: 'readonly',
      },
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      '@typescript-eslint': tsPlugin,
      import: importPlugin,
      prettier: prettierPlugin,
      'react-compiler': reactCompilerPlugin,
    },
    settings: {
      react: {
        version: '19.1.0',
      },
    },
    rules: {
      // React rules - all strict
      'react/jsx-no-bind': [
        'error',
        {
          allowArrowFunctions: true,
          allowFunctions: false,
          allowBind: false,
        },
      ],
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/jsx-uses-react': 'error',
      'react/jsx-uses-vars': 'error',
      'react/jsx-no-duplicate-props': 'error',
      'react/jsx-no-undef': 'error',
      'react/no-direct-mutation-state': 'error',
      'react/no-unknown-property': 'error',
      'react/no-array-index-key': 'error',
      'react/no-unsafe': 'error',

      // React hooks - all strict
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      'react-compiler/react-compiler': 'error',

      // TypeScript rules - all strict
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-empty-interface': 'error',
      '@typescript-eslint/no-empty-function': 'error',
      '@typescript-eslint/no-var-requires': 'error',
      '@typescript-eslint/prefer-namespace-keyword': 'error',
      '@typescript-eslint/triple-slash-reference': 'error',

      // Import rules - all strict
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import/no-duplicates': 'error',
      'import/first': 'error',
      'import/no-self-import': 'error',
      'import/no-cycle': 'error',
      'import/no-named-as-default': 'error',
      'import/no-useless-path-segments': 'error',

      // General rules
      'no-undef': 'error',
      'no-unused-vars': 'off', // Using @typescript-eslint/no-unused-vars instead
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-constant-binary-expression': 'error',
      'no-unexpected-multiline': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'no-duplicate-imports': 'error',
      'no-else-return': 'error',
      'no-empty': 'error',
      'no-throw-literal': 'error',
      'no-useless-return': 'error',
      'no-return-await': 'error',
      'no-shadow': 'error',
      'prefer-template': 'error',
      'require-await': 'error',
      yoda: 'error',
      eqeqeq: 'error',
      'arrow-body-style': ['error', 'as-needed'],
      curly: ['error', 'all'],
      'spaced-comment': ['error', 'always'],

      // Prettier
      'prettier/prettier': 'error',
    },
  },
];

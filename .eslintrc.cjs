/* eslint-env node */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: ['./tsconfig.json'],
    tsconfigRootDir: __dirname,
  },
  plugins: ['@typescript-eslint', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'prettier',
  ],
  settings: {
    'import/resolver': { typescript: { project: './tsconfig.json' } },
  },
  ignorePatterns: ['dist', 'node_modules', 'python', 'java', '*.cjs'],
  rules: {
    // ADR 0005: zero runtime dependencies. Anything imported at runtime that is not
    // relative or a node: builtin is a contract break, not a style preference.
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['!node:*', '!./*', '!../*'],
            message:
              'payzeno-contracts has zero runtime dependencies (docs/adr/0005). Use a relative import.',
          },
        ],
      },
    ],
    // `enum` is banned: isolatedModules cannot elide it and the Python emitter would
    // have to invent a Literal for it anyway. `as const` tuple + derived union only.
    'no-restricted-syntax': [
      'error',
      { selector: 'TSEnumDeclaration', message: 'Use an `as const` tuple + derived union, not `enum`.' },
      { selector: "NewExpression[callee.name='Date']", message: 'Timestamps are RFC 3339 strings. No Date in contracts.' },
    ],
    '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
    '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
    '@typescript-eslint/explicit-module-boundary-types': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'import/no-cycle': ['error', { maxDepth: Infinity }],
    'import/order': ['error', { 'newlines-between': 'always', alphabetize: { order: 'asc' } }],
    'import/no-default-export': 'error',
    eqeqeq: ['error', 'always'],
  },
  overrides: [
    {
      // The layering rule from the blueprint: src/types/** is a leaf tier. Nothing in it
      // may reach back up into the barrel, the events tree, internal/ or codegen/.
      files: ['src/types/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['../index', '../events', '../events/*', '../internal/*', '../codegen/*'],
                message:
                  'src/types/** is layer L0/L1. It may only import other src/types modules.',
              },
            ],
          },
        ],
      },
    },
    {
      files: ['src/internal/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          { patterns: [{ group: ['*'], message: 'src/internal/** imports nothing. That is the point.' }] },
        ],
      },
    },
    {
      files: ['*.config.ts', 'src/**/*.test.ts'],
      rules: {
        'import/no-default-export': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
      },
    },
  ],
};

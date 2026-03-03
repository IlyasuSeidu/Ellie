module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
    jest: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['react', 'react-hooks', '@typescript-eslint'],
  rules: {
    // React rules
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    'react/display-name': 'off',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'error',

    // TypeScript rules
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-non-null-assertion': 'error',

    // General rules
    'no-console': [
      'warn',
      {
        allow: ['warn', 'error'],
      },
    ],
    'no-unused-vars': 'off', // Use @typescript-eslint/no-unused-vars instead
    'consistent-return': 'error',
    'no-var': 'error',
    'prefer-const': 'error',
    'prefer-arrow-callback': 'warn',
    'no-duplicate-imports': 'error',
    eqeqeq: ['error', 'always'],
    'no-else-return': 'warn',
    'no-return-await': 'error',
    'require-await': 'error',
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  overrides: [
    {
      files: ['**/__tests__/**/*.{js,jsx,ts,tsx}', '**/*.{test,spec}.{js,jsx,ts,tsx}'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        'require-await': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        'no-console': 'off',
      },
    },
    {
      files: ['backend/functions/**/*.js'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        'no-var': 'off',
      },
    },
  ],
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    '.expo/',
    'coverage/',
    '.tmp-*/',
    '.venv-oww/',
    '*.config.js',
    'babel.config.js',
    'jest.setup.js',
    'metro.config.js',
    'backend/functions/lib/',
    'modules/**/build/',
    'modules/**/.gradle/',
    'ios/',
    'android/',
  ],
};

module.exports = {
  rootDir: __dirname,
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: ['**/__tests__/**/*.ts?(x)', '**/?(*.)+(spec|test).ts?(x)'],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/__mocks__/**',
    // Exclude infrastructure code from coverage requirements
    // These require different testing strategies (integration/e2e tests)
    '!src/services/**',
    '!src/config/**',
    '!src/navigation/**',
    '!src/types/**',
    '!src/constants/**',
  ],
  coverageReporters: ['text', 'lcov', 'json-summary'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/screens/(.*)$': '<rootDir>/src/screens/$1',
    '^@/utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@/hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@/services/(.*)$': '<rootDir>/src/services/$1',
    '^@/types/(.*)$': '<rootDir>/src/types/$1',
    '^@/constants/(.*)$': '<rootDir>/src/constants/$1',
    '^@/config/(.*)$': '<rootDir>/src/config/$1',
    '^@/assets/(.*)$': '<rootDir>/assets/$1',
  },
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|expo|expo-.*|@expo|@expo-.*|@unimodules|unimodules|@react-navigation|react-native-gesture-handler)/)',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/e2e/',
    'src/__tests__/App.test.tsx', // Requires React Native test environment
    'tests/services/firebase/FirebaseService.test.ts', // Firebase ESM import issues with Jest
  ],
};

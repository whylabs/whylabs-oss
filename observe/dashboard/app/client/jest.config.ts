import type { Config } from 'jest';

const config: Config = {
  clearMocks: true,
  moduleDirectories: ['node_modules', '<rootdir>/src'],
  moduleFileExtensions: ['ts', 'tsx', 'js'],
  moduleNameMapper: {
    '~/(.*)': '<rootDir>/src/$1',
    '~server/(.*)': '<rootDir>/../src/$1',
    '^uuid$': require.resolve('uuid'),
  },
  modulePathIgnorePatterns: ['<rootDir>/build/', '<rootDir>/dist/'],
  setupFilesAfterEnv: ['./setupTests.ts'],
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  testMatch: ['**/tests/*.+(ts|tsx|js)', '**/?(*.)+(test).+(ts|tsx|js)'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest',
    '^.+\\.svg$': 'jest-transformer-svg',
  },
  transformIgnorePatterns: ['<rootDir>/node_modules/(?!(query-string)/)'],
};

export default config;

import type { Config } from 'jest';

process.env['LOG_LEVEL'] = 'info';

const config: Config = {
  moduleDirectories: ['node_modules', '<rootdir>/src'],
  modulePathIgnorePatterns: ['<rootDir>/build/', '<rootDir>/dist/', '<rootDir>/lib/', '<rootDir>/config/'],
  setupFilesAfterEnv: ['<rootDir>/src/tests/integration/setup.ts'],
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/integration/**/*.test.ts'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'ts-jest',
  },
  // by default, node_modules isnt transformed - but some of them need to be (or get error on use of import)
  transformIgnorePatterns: ['node_modules/(?!(node-fetch|data-uri-to-buffer|fetch-blob|formdata-polyfill)/)'],
};

export default config;

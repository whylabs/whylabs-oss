/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testRunner: 'jasmine2',
  testEnvironment: 'node',
  testMatch: ['**/?(*.)+(spec|test).ts'],
};

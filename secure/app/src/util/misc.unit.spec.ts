import { assert, expect } from 'chai';
import { v4 as uuid } from 'uuid';

import { getNumericEnvVar } from './misc';

describe('Test misc utils', function () {
  describe('Test throwIfNullish', function () {
    it('should not throw if operand is not null or undefined', function () {
      assert.doesNotThrow(() => 'foo');
    });
    it('should throw if operand is null', function () {
      assert.throws(() => null);
    });
    it('should throw if operand is undefined', function () {
      assert.throws(() => undefined);
    });
  });

  describe('Test getNumericEnvVar', function () {
    it('should return null if env var is not set', function () {
      const value = getNumericEnvVar(uuid());
      expect(value).to.equal(null);
    });

    it('should return null if env var is not a number', function () {
      const testEnvVarName = `test-env-var-${uuid()}`;
      process.env[testEnvVarName] = 'foo';
      const value = getNumericEnvVar(testEnvVarName);
      expect(value).to.equal(null);
    });

    it('should return null if env var is an empty string', function () {
      const testEnvVarName = `test-env-var-${uuid()}`;
      process.env[testEnvVarName] = '';
      const value = getNumericEnvVar(testEnvVarName);
      expect(value).to.equal(null);
    });

    it('should return null if env var is undefined', function () {
      const testEnvVarName = `test-env-var-${uuid()}`;
      process.env[testEnvVarName] = undefined;
      const value = getNumericEnvVar(testEnvVarName);
      expect(value).to.equal(null);
    });

    it('should return correct value if env var is set to an integer', function () {
      const testEnvVarName = `test-env-var-${uuid()}`;
      process.env[testEnvVarName] = '123';
      const value = getNumericEnvVar(testEnvVarName);
      expect(value).to.equal(123);
    });

    it('should return correct value if env var is set to a fractional number', function () {
      const testEnvVarName = `test-env-var-${uuid()}`;
      process.env[testEnvVarName] = '123.123';
      const value = getNumericEnvVar(testEnvVarName);
      expect(value).to.equal(123.123);
    });
  });
});

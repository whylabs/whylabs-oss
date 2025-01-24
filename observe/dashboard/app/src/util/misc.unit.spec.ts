import { assert, expect } from 'chai';
import { v4 as uuid } from 'uuid';

import { SegmentTag } from '../graphql/generated/graphql';
import { extractEmailDomain, fnThrow, getNumericEnvVar, pathToBucketKey } from './misc';
import { segmentTextToTags } from './tags';

describe('Test misc utils', function () {
  describe('Test pathToBucketKey', function () {
    it('should parse simple s3 path', function () {
      const { bucket, key } = pathToBucketKey('s3://bucket/key');
      expect(bucket).to.equal('bucket');
      expect(key).to.equal('key');
    });
    it('should parse nested s3 path', function () {
      const { bucket, key } = pathToBucketKey('s3://bucket/key/nestedkey/object');
      expect(bucket).to.equal('bucket');
      expect(key).to.equal('key/nestedkey/object');
    });
    it('should throw exception for invalid s3 patph', function () {
      assert.throws(() => pathToBucketKey('my/paht'), Error);
    });
  });

  describe('Test throwIfNullish', function () {
    it('should not throw if operand is not null or undefined', function () {
      const operand: string | null = 'foo';
      assert.doesNotThrow(() => operand ?? fnThrow('bar'));
    });
    it('should throw if operand is null', function () {
      const operand: string | null = null;
      assert.throws(() => operand ?? fnThrow('bar'));
    });
    it('should throw if operand is undefined', function () {
      const operand: string | undefined = undefined;
      assert.throws(() => operand ?? fnThrow('bar'));
    });
  });

  describe('Test extractEmailDomain', function () {
    it('should return domain', function () {
      const emailExpectations: { [email: string]: string } = {
        'test@whylabs.ai': 'whylabs.ai',
        'foo+bar@gmail.com': 'gmail.com',
      };

      for (const email in emailExpectations) {
        const domain = extractEmailDomain(email);
        expect(domain).to.equal(emailExpectations[email]);
      }
    });
  });

  describe('Test segmentTextToTags', function () {
    it('should return correct segment tags', function () {
      const segmentA: SegmentTag = {
        key: 'foo',
        value: 'bar',
      };
      const segmentB: SegmentTag = {
        key: 'foo2',
        value: 'bar2',
      };
      const segmentTags = [segmentA, segmentB];
      const segmentText = `${segmentA.key}=${segmentA.value}&${segmentB.key}=${segmentB.value}`;
      const parsed = segmentTextToTags(segmentText);
      expect(JSON.stringify(parsed)).to.equal(JSON.stringify(segmentTags));
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

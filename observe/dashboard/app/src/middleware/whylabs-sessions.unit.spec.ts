import { expect } from 'chai';
import { Request } from 'express';
import { noop } from 'lodash';
import { Logger } from 'pino';

import { USER_AGENT_HEADER_NAME, WHYLABS_SESSION_COOKIE_NAME } from '../constants';
import { validateSessionFingerprint } from './whylabs-sessions';

const getSampleRequest = (
  userAgent = 'Mozilla/5.0 (iPad; CPU OS 13_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/103.0.0.0 Mobile/15E148 Safari/604.5',
): Request => {
  return {
    [WHYLABS_SESSION_COOKIE_NAME]: { initialFingerprint: { hash: 'VzlM/As4rhtKvolJXledM7ck8VSMVh9mMaUsJcxTdUU=' } },
    header: (name: string): string => {
      if (name === USER_AGENT_HEADER_NAME) {
        return userAgent;
      }

      throw Error(`Requested unknown header ${name}`);
    },
  } as unknown as Request; // TODO these casts are killing me, but I can't get Requests to be correctly typed here otherwise with the additional Dashbird props
};

const mockLogger = { warn: noop } as Logger;

describe('Session validation works', function () {
  describe('validateSessionFingerprint', function () {
    it('should validate sessions with no initial fingerprint', function () {
      const req = {} as Request;
      const res = validateSessionFingerprint(req, mockLogger);
      expect(res).to.be.true;
    });

    it('should validate sessions with the same initial fingerprint as current', function () {
      const req = getSampleRequest();
      const res = validateSessionFingerprint(req, mockLogger);
      expect(res).to.be.true;
      expect((req as unknown as Record<string, unknown>)[WHYLABS_SESSION_COOKIE_NAME]).to.not.be.undefined;
    });

    it('should invalidate sessions with a different initial fingerprint than current', function () {
      const req = getSampleRequest('some weird user agent');

      // session should exist before validation
      expect((req as unknown as Record<string, unknown>)[WHYLABS_SESSION_COOKIE_NAME]).to.not.be.undefined;
      const res = validateSessionFingerprint(req, mockLogger);
      expect(res).to.be.false;
    });
  });
});

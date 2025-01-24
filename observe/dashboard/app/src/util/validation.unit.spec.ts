import { expect } from 'chai';

import { validateEmail } from './validation';

describe('Validation works', function () {
  describe('test validateEmail', function () {
    it('should accept standard emails', function () {
      const email = 'foo@bar.com';
      expect(() => validateEmail(email)).to.not.throw();
    });
    it('should accept standard emails with tags', function () {
      const email = 'foo+asdasdads@bar.com';
      expect(() => validateEmail(email)).to.not.throw();
    });
    it('should accept emails with hyphens', function () {
      const email = 'foo-foo@bar-bar.com';
      expect(() => validateEmail(email)).to.not.throw();
    });
    it('should accept non-english emails', function () {
      const email = 'почта@россии.рф';
      expect(() => validateEmail(email)).to.not.throw();
    });
    it('should reject random strings', function () {
      const email = 'asdasdasd';
      expect(() => validateEmail(email)).to.throw();
    });
    it('should reject empty strings', function () {
      const email = '';
      expect(() => validateEmail(email)).to.throw();
    });
  });
});

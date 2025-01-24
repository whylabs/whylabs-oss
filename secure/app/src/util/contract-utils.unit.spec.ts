import { expect } from 'chai';

import { arrayToCommaSeparated, commaSeparatedToArray } from './contract-utils';

describe('Contract utils work', function () {
  describe('test commaSeparatedToArray', function () {
    it('should convert comma separated strings', function () {
      expect(commaSeparatedToArray('test,me')).to.eql(['test', 'me']);
    });
    it('should convert empty string to empty list', function () {
      expect(commaSeparatedToArray('')).to.eql([]);
    });
    it('should convert undefined to empty list', function () {
      expect(commaSeparatedToArray(undefined)).to.eql([]);
    });
    it('should trim by default', function () {
      expect(commaSeparatedToArray(' test, me ')).to.eql(['test', 'me']);
    });
    it('should not trim if false', function () {
      expect(commaSeparatedToArray(' test, me ', false)).to.eql([' test', ' me ']);
    });
  });
  describe('test arrayToCommaSeparated', function () {
    it('should convert comma separated strings', function () {
      expect(arrayToCommaSeparated(['test', 'me'])).to.eql('test,me');
    });
    it('should convert empty list to empty string', function () {
      expect(arrayToCommaSeparated([])).to.eql('');
    });
    it('should convert undefined to empty string', function () {
      expect(arrayToCommaSeparated(undefined)).to.eql('');
    });
    it('should not trim if false', function () {
      expect(arrayToCommaSeparated([' test', ' me '], false)).to.eql(' test, me ');
    });
  });
});

import { expect } from 'chai';

import { paramSetsToArrays } from './data-utils';

describe('Data utils', function () {
  describe('paramSetsToArrays', function () {
    it('should return an empty array if params are empty', function () {
      // const expected = [];
      const actual = paramSetsToArrays([{ p1: new Set<number>() }], ['p1']);
      expect(actual).to.eql({ p1: [] });
      expect([]).to.eql([]);
    });

    it('should return values', function () {
      // const expected = [];
      const actual = paramSetsToArrays([{ p1: new Set([1, 2]) }], ['p1']);
      expect(actual).to.eql({ p1: [1, 2] });
    });

    it('should remove duplicate values', function () {
      // const expected = [];
      const actual = paramSetsToArrays([{ p1: new Set([1, 2, 1]) }], ['p1']);
      expect(actual).to.eql({ p1: [1, 2] });
    });

    it('should filter returned keys to specified targets', function () {
      // const expected = [];
      const actual = paramSetsToArrays([{ p1: new Set([1]), p2: new Set([2]) }], ['p1']);
      expect(actual).to.eql({ p1: [1] });
    });

    // Current code does not collapse duplicate object or array values
    xit('should remove duplicate array values', function () {
      // const expected = [];
      const actual = paramSetsToArrays([{ p1: new Set([[1], [2], [1]]) }], ['p1']);
      expect(actual).to.eql({ p1: [[1], [2]] });
    });

    xit('should remove duplicate object values', function () {
      // const expected = [];
      const actual = paramSetsToArrays([{ p1: new Set([{ a: 1 }, { a: 2 }, { a: 1 }]) }], ['p1']);
      expect(actual).to.eql({ p1: [{ a: 1 }, { a: 2 }] });
    });
  });
});

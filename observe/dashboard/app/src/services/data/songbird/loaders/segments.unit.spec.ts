import { expect } from 'chai';

import { SegmentTag } from '../../../../graphql/generated/graphql';
import { isSegmentExactMatch } from './segments';

describe('Segment loader tests', function () {
  describe('isSegmentExactMatch', function () {
    it('works', function () {
      const a: SegmentTag[] = [{ key: 'foo', value: 'bar' }];
      const b: SegmentTag[] = [{ key: 'foo', value: 'bar' }];

      expect(isSegmentExactMatch(a, b)).to.be.true;
    });

    it('catches differently sized segments', function () {
      const a: SegmentTag[] = [{ key: 'foo', value: 'bar' }];
      const b: SegmentTag[] = [
        { key: 'foo', value: 'bar' },
        { key: 'foo2', value: 'bar2' },
      ];

      expect(isSegmentExactMatch(a, b)).to.be.false;
    });

    it("doesn't care about tag order", function () {
      const a: SegmentTag[] = [
        { key: 'foo2', value: 'bar2' },
        { key: 'foo', value: 'bar' },
      ];
      const b: SegmentTag[] = [
        { key: 'foo', value: 'bar' },
        { key: 'foo2', value: 'bar2' },
      ];

      expect(isSegmentExactMatch(a, b)).to.be.true;
    });

    it('catches complete mismatches', function () {
      const a: SegmentTag[] = [{ key: 'foo2', value: 'bar2' }];
      const b: SegmentTag[] = [{ key: 'foo', value: 'bar' }];

      expect(isSegmentExactMatch(a, b)).to.be.false;
    });

    it('catches value mismatches', function () {
      const a: SegmentTag[] = [{ key: 'foo', value: 'bar2' }];
      const b: SegmentTag[] = [{ key: 'foo', value: 'bar' }];

      expect(isSegmentExactMatch(a, b)).to.be.false;
    });

    it('catches key mismatches', function () {
      const a: SegmentTag[] = [{ key: 'foo', value: 'bar' }];
      const b: SegmentTag[] = [{ key: 'foo2', value: 'bar' }];

      expect(isSegmentExactMatch(a, b)).to.be.false;
    });

    it('works for empty tags', function () {
      const a: SegmentTag[] = [];
      const b: SegmentTag[] = [];

      expect(isSegmentExactMatch(a, b)).to.be.true;
    });

    it('works for empty tags compared to a segment', function () {
      const a: SegmentTag[] = [];
      const b: SegmentTag[] = [{ key: 'foo', value: 'bar' }];

      expect(isSegmentExactMatch(a, b)).to.be.false;
    });
  });
});

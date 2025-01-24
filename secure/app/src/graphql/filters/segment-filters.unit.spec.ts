import { expect } from 'chai';

import { SegmentTag, SortDirection } from '../../types/api';
import { filterSegmentTags } from './segment-filters';

const baseSampleTags: SegmentTag[] = [
  {
    key: 'purpose',
    value: 'car',
  },
  {
    key: 'verification_status',
    value: 'Not Verified',
  },
  {
    key: 'verification_status',
    value: 'Verified',
  },
];

describe('Filtering segment tags works', function () {
  it('should filter segment values', function () {
    const results = filterSegmentTags(baseSampleTags, [], 'value', null, 'CA');
    expect(results).to.deep.eq(['car']);
  });

  it('should apply limit spec', function () {
    const results = filterSegmentTags(baseSampleTags, [], 'value', { offset: 1, limit: 1 }, '');
    expect(results).to.deep.eq(['Not Verified']);
  });

  it('should not filter items if no search string was supplied', function () {
    const results = filterSegmentTags(
      baseSampleTags,
      [],
      'value',
      { offset: 0, limit: 0, sortDirection: SortDirection.Asc },
      '',
    );
    expect(results).to.deep.eq(baseSampleTags.map((t) => t.value));
  });

  it('should apply sort correctly', function () {
    const results = filterSegmentTags(
      baseSampleTags,
      [],
      'value',
      { offset: 0, limit: 1, sortDirection: SortDirection.Desc },
      '',
    );
    expect(results).to.deep.eq(['Verified']);
  });

  it('should filter out excluded tags', function () {
    const results = filterSegmentTags(baseSampleTags, [baseSampleTags[0]], 'key', null, '');
    expect(results).to.deep.eq(['verification_status']);
  });
});

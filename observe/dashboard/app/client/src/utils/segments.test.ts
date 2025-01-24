import { segmentStringToTags, segmentTagsToString } from '~/utils/segments';

const mockedSegment = [
  { key: 'col1', value: 'segment1' },
  { key: 'location', value: 'location1' },
];

describe('testing segments translations', () => {
  it('test segment stringify', () => {
    const result = segmentTagsToString(mockedSegment);
    expect(result).toEqual('col1=segment1&location=location1');
  });

  it('test segment string parse', () => {
    const result = segmentStringToTags('col1=segment1&location=location1');
    expect(result).toStrictEqual(mockedSegment);
  });

  it('test segment empty string parse', () => {
    const result = segmentStringToTags('');
    expect(result).toStrictEqual([]);
  });
});

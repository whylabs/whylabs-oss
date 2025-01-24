import { addOrReplaceSegmentInSearch, getSegmentsFromSearch } from 'utils/segmentQueryUtils';
import { ParsedSegment, searchStringifySegment } from 'pages/page-types/pageUrlQuery';

describe('Tests for adding segments in the query string', () => {
  it('can read segment information from a query string', () => {
    const seg: ParsedSegment = {
      tags: [
        {
          key: 'foo',
          value: 'one',
        },
        {
          key: 'bar',
          value: 'two',
        },
      ],
    };
    const segmentInSearch = searchStringifySegment(seg);
    const { tags } = getSegmentsFromSearch(new URLSearchParams(segmentInSearch));
    expect(tags.length).toBe(2);
    expect(tags).toEqual([
      { key: 'foo', value: 'one' },
      { key: 'bar', value: 'two' },
    ]);
  });

  it('has no problem with url escaped characters', () => {
    const seg: ParsedSegment = {
      tags: [
        {
          key: 'foo:/is this realistic?',
          value: 'one is the loneliest number',
        },
        {
          key: 'bar|$what other & weird stuff/',
          value: 'two: better than the number one',
        },
      ],
    };
    const segmentInSearch = searchStringifySegment(seg);
    const { tags } = getSegmentsFromSearch(new URLSearchParams(segmentInSearch));
    expect(tags.length).toBe(2);
    expect(tags).toEqual([
      { key: 'foo:/is this realistic?', value: 'one is the loneliest number' },
      { key: 'bar|$what other & weird stuff/', value: 'two: better than the number one' },
    ]);
  });

  it('ignores extra keys in a malformed set', () => {
    const seg: ParsedSegment = {
      tags: [
        {
          key: 'foo',
          value: 'one',
        },
        {
          key: 'bar',
          value: 'two',
        },
      ],
    };
    const segmentInSearch = `${searchStringifySegment(seg)}&segmentkey=hello`;
    const { tags } = getSegmentsFromSearch(new URLSearchParams(segmentInSearch));
    expect(tags.length).toBe(2);
    expect(tags).toEqual([
      { key: 'foo', value: 'one' },
      { key: 'bar', value: 'two' },
    ]);
  });
});

describe('Tests for replacing an existing query string segment', () => {
  it('adds the segment params to a search object that has none', () => {
    const seg: ParsedSegment = {
      tags: [
        {
          key: 'foo',
          value: 'one',
        },
        {
          key: 'bar',
          value: 'two',
        },
      ],
    };
    const existingQuery = new URLSearchParams('');
    const foundSomething = addOrReplaceSegmentInSearch(existingQuery, seg);
    expect(foundSomething).toBeFalsy();
    const { tags } = getSegmentsFromSearch(existingQuery);
    expect(tags.length).toBe(2);
    expect(tags).toEqual([
      { key: 'foo', value: 'one' },
      { key: 'bar', value: 'two' },
    ]);
  });

  it('replaces all params from an existing object', () => {
    const seg: ParsedSegment = {
      tags: [
        {
          key: 'foo',
          value: 'one',
        },
        {
          key: 'bar',
          value: 'two',
        },
      ],
    };
    const existingQuery = new URLSearchParams('');
    addOrReplaceSegmentInSearch(existingQuery, seg);
    const seg2: ParsedSegment = {
      tags: [
        {
          key: 'foo2',
          value: 'one2',
        },
        {
          key: 'bar2',
          value: 'two2',
        },
      ],
    };
    const foundSomething = addOrReplaceSegmentInSearch(existingQuery, seg2);
    expect(foundSomething).toBeTruthy();

    const { tags } = getSegmentsFromSearch(existingQuery);
    expect(tags.length).toBe(2);
    expect(tags).toEqual([
      { key: 'foo2', value: 'one2' },
      { key: 'bar2', value: 'two2' },
    ]);
  });

  it('does nothing to other params on an existing object when adding', () => {
    const seg: ParsedSegment = {
      tags: [
        {
          key: 'foo',
          value: 'one',
        },
        {
          key: 'bar',
          value: 'two',
        },
      ],
    };
    const existingQuery = new URLSearchParams('');
    existingQuery.append('hello', 'world');

    // checking the boolean return again when there is an extra param present
    const foundSomething = addOrReplaceSegmentInSearch(existingQuery, seg);
    expect(existingQuery.get('hello')).toEqual('world');
    expect(foundSomething).toBeFalsy();
    const { tags } = getSegmentsFromSearch(existingQuery);
    expect(tags.length).toBe(2);
    expect(tags).toEqual([
      { key: 'foo', value: 'one' },
      { key: 'bar', value: 'two' },
    ]);
  });

  it('does nothing to other params on an existing object when replacing', () => {
    const seg: ParsedSegment = {
      tags: [
        {
          key: 'foo',
          value: 'one',
        },
        {
          key: 'bar',
          value: 'two',
        },
      ],
    };
    const existingQuery = new URLSearchParams('');
    addOrReplaceSegmentInSearch(existingQuery, seg);
    existingQuery.append('hello', 'world');
    existingQuery.append('whylabs', 'whylogs');

    const seg2: ParsedSegment = {
      tags: [
        {
          key: 'foo2',
          value: 'one2',
        },
        {
          key: 'bar2',
          value: 'two2',
        },
      ],
    };
    const foundSomething = addOrReplaceSegmentInSearch(existingQuery, seg2);
    expect(foundSomething).toBeTruthy();

    const { tags } = getSegmentsFromSearch(existingQuery);
    expect(tags.length).toBe(2);
    expect(tags).toEqual([
      { key: 'foo2', value: 'one2' },
      { key: 'bar2', value: 'two2' },
    ]);
    expect(existingQuery.get('hello')).toEqual('world');
    expect(existingQuery.get('whylabs')).toEqual('whylogs');
  });

  it('url encodes necessary characters', () => {
    const seg: ParsedSegment = {
      tags: [
        {
          key: 'foo:/is this realistic?',
          value: 'one is the loneliest number',
        },
        {
          key: 'bar|$what other & weird stuff/',
          value: 'two: better than the number one',
        },
      ],
    };
    const existingQuery = new URLSearchParams('');
    addOrReplaceSegmentInSearch(existingQuery, seg);
    const { tags } = getSegmentsFromSearch(existingQuery);
    expect(tags.length).toBe(2);
    expect(tags).toEqual([
      { key: 'foo:/is this realistic?', value: 'one is the loneliest number' },
      { key: 'bar|$what other & weird stuff/', value: 'two: better than the number one' },
    ]);
  });
});

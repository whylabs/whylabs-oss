import { ParsedSegment, parseSimpleDisplaySegment, simpleStringifySegment } from 'pages/page-types/pageUrlQuery';
import queryString from 'query-string';

describe('Segment stringification tests', () => {
  it('Stringifies a simple segment as expected', () => {
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
    expect(simpleStringifySegment(seg)).toEqual('key=foo&value=one&key=bar&value=two');
  });

  it('Stringifies a simple segment with prefixes as expected', () => {
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
    expect(simpleStringifySegment(seg, 'spam')).toEqual('spamkey=foo&spamvalue=one&spamkey=bar&spamvalue=two');
  });

  it('maintains order with query string arrays', () => {
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
    const reversedSeg: ParsedSegment = {
      tags: [
        {
          key: 'foo',
          value: 'two',
        },
        {
          key: 'bar',
          value: 'one',
        },
      ],
    };
    const parsed = queryString.parse(simpleStringifySegment(seg));
    expect(parsed).toEqual({
      key: ['foo', 'bar'],
      value: ['one', 'two'],
    });
    const reverseParsed = queryString.parse(simpleStringifySegment(reversedSeg));
    expect(reverseParsed).toEqual({
      key: ['foo', 'bar'],
      value: ['two', 'one'],
    });
  });

  it('is idempotent when stringifying and then parsing', () => {
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
    const fullTripSegment = parseSimpleDisplaySegment(simpleStringifySegment(seg));
    expect(fullTripSegment).toEqual(seg);
  });

  it('adds and removes prefixes while stringifying and parsing', () => {
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
    const fullTripSegment = parseSimpleDisplaySegment(simpleStringifySegment(seg, 'hello'), 'hello');
    expect(fullTripSegment).toEqual(seg);
  });

  it('handles empty values well', () => {
    const seg: ParsedSegment = {
      tags: [],
    };
    const fullTripSegment = parseSimpleDisplaySegment(simpleStringifySegment(seg));
    expect(fullTripSegment).toEqual(seg);
  });

  it('can unparse mismatched values', () => {
    const seg: ParsedSegment = {
      tags: [
        {
          key: 'foo',
          value: 'one',
        },
      ],
    };

    const parsedSegment = parseSimpleDisplaySegment(simpleStringifySegment(seg));
    expect(parsedSegment).toEqual(seg);
  });
});

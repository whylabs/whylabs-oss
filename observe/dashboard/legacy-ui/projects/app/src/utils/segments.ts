import { SegmentTag } from 'generated/graphql';

export const segmentTagToString = (tag: SegmentTag): string => {
  return `${tag.key}=${tag.value}`;
};

/**
 * Converts an array of segment tags to their stringified representation
 * @param tags Segment tags
 * @param overallSegmentName Name to use for the "overall" segment
 */
export const segmentTagsToString = (tags?: SegmentTag[] | null, overallSegmentName = 'all'): string => {
  if (!tags?.length) return overallSegmentName;

  return tags.map((tag) => `${tag.key}=${tag.value}`).join('&');
};

/**
 * Converts textual representation of segment tags to an array of key/value pairs
 * @param segmentText Segment text in the form key=value&key2=value2
 * @throws An error upon encountering invalid segments
 */
export const segmentStringToTags = (segmentText?: string | null): SegmentTag[] => {
  if (segmentText == null || !segmentText.length) return [];

  return (
    segmentText
      .split('&')
      // these should look like foo=bar, foo2=bar2 now
      .map((kvPair) => {
        const pair = kvPair.split('=');

        // there should be exactly 2 values here, a key and a value
        // more than that implies an `=` sign as part of the segment key or value, which is not supported atm
        if (pair.length !== 2) {
          throw Error(`Unable to parse segment tag ${kvPair} in segment ${segmentText}`);
        }
        return {
          key: pair[0],
          value: pair[1],
        };
      })
  );
};

import { SegmentTag as GQLSegmentTag } from '../graphql/generated/graphql';
import { getLogger } from '../providers/logger';
import { OperationContext } from './misc';

const logger = getLogger('utilTagsLogger');

/**
 * Converts textual representation of segment tags to an array of key/value pairs
 * NOTE: no major tag validation is performed here
 * @param segmentText Segment text in the form key=value&key2=value2
 */
export const segmentTextToTags = (segmentText?: string | null): GQLSegmentTag[] => {
  if (segmentText == null || !segmentText.length) return [];

  return (
    segmentText
      // these should look like foo=bar, foo2=bar2 now
      .split('&')
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

/**
 * Converts an array of segment text to an array of segment tags, skipping badly formed ones
 * @param segmentTexts[] Segment texts in the form key=value&key2=value2
 */
export const segmentTextArrayToTags = (segmentTexts: string[], context: OperationContext): GQLSegmentTag[][] => {
  const parsedTags: GQLSegmentTag[][] = [];
  segmentTexts.forEach((segmentText) => {
    try {
      parsedTags.push(segmentTextToTags(segmentText));
    } catch (tagErr) {
      if (tagErr instanceof Error) {
        logger.warn(`Tag error: ${tagErr.message} in org ${context.orgId} dataset ${context.datasetId}`);
      } else {
        logger.error(`Unexpected error ${tagErr} parsing tags in org ${context.orgId} dataset ${context.datasetId}`);
      }
    }
  });
  return parsedTags;
};

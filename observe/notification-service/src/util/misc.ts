import { SegmentTag } from '@whylabs/songbird-node-client';
import { Logger } from 'pino';

export const fnThrow = (msg: string): never => {
  throw Error(msg);
};

/**
 * Converted textual representation of segment tags to a tags array
 * NOTE: no validation is performed here
 * Copy-pasted from Dashbird with minor changes
 * // TODO: adds this to a shared library
 * @param logger Logger to use in case something goes wrong
 * @param segmentText Segment text in the form key=value&key2=value2
 */
export const segmentTextToTags = (logger: Logger, segmentText?: string | null): SegmentTag[] => {
  if (segmentText == null || !segmentText.length) {
    return [];
  }

  try {
    return (
      segmentText
        // these should look like foo=bar&foo2=bar2 to start
        .split('&')
        .map((kvPair) => {
          const kv = kvPair.split('=');
          // there should be exactly 2 values here, a key and a value
          if (kv.length !== 2) {
            throw Error(`Unable to parse segment tag ${kvPair} in segment ${segmentText}`);
          }
          return {
            key: kv[0],
            value: kv[1],
          };
        })
    );
  } catch (err) {
    // in Siren, we don't want to completely fail the notification job if a particular segment could not be parsed
    // we still want to notify on the rest
    logger.error(err, 'Failed to parse at least some segments');
    return [];
  }
};

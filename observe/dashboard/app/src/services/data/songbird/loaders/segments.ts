import { equals } from 'ramda';

import { SegmentTag } from '../../../../graphql/generated/graphql';

const sortTags = (tags: SegmentTag[]): SegmentTag[] => tags.slice().sort((t1, t2) => t1.key.localeCompare(t2.key));

/**
 * Checks whether the two sets of segment tags are exactly equal.
 * The supplied tags don't have to be sorted.
 * @param tagsA
 * @param tagsB
 */
export const isSegmentExactMatch = (tagsA: SegmentTag[], tagsB: SegmentTag[]): boolean => {
  const tagsASorted = sortTags(tagsA);
  const tagsBSorted = sortTags(tagsB);

  return equals(tagsASorted, tagsBSorted);
};

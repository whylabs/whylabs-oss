import { z } from 'zod';

import { filterSegmentTags } from '../../graphql/filters/segment-filters';
import { SegmentTag } from '../../graphql/generated/graphql';
import {
  getPaginatedSegmentKeys,
  getSegmentTags,
  getSegmentsForKey,
} from '../../services/data/data-service/api-wrappers/segments';
import { CallOptions } from '../../util/async-helpers';
import { notNullish } from '../../util/misc';
import { router, viewDataProcedure } from '../trpc';
import { callOptionsFromTrpcContext } from '../util/call-context';
import { requiredOrgAndResourceSchema, segmentTagsSchema } from '../util/schemas';

export const prepareSegmentsToQuery = async ({
  orgId,
  resourceId,
  segment,
  callOptions,
}: {
  orgId: string;
  resourceId: string;
  segment: SegmentTag[] | undefined;
  callOptions: CallOptions;
}): Promise<SegmentTag[][]> => {
  if (!segment) return [];

  const segmentsToQuery: SegmentTag[][] = [];
  let hasWildcard = false;

  for (let i = 0; i < segment.length; i++) {
    const { key, value } = segment[i];

    // If the value is a wildcard
    if (value === '*') {
      hasWildcard = true;

      // fetch all possible values for the segment
      const allSegmentValues = await getSegmentsForKey({ orgId, resourceId, key, tags: [] }, callOptions);

      const copy = [...segment];
      // Remove the wildcard segment
      copy.splice(i, 1);

      // Create a segment to query for each possible value
      for (let j = 0; j < allSegmentValues.length; j++) {
        const segment = [...copy, { key: key, value: allSegmentValues[j] }];
        segmentsToQuery.push(segment);
      }
    }
  }

  if (!hasWildcard && segment.length) {
    segmentsToQuery.push(segment);
  }

  return segmentsToQuery;
};

const segments = router({
  list: viewDataProcedure.input(requiredOrgAndResourceSchema).query(async ({ ctx, input }) => {
    const { orgId, resourceId } = input;
    return getSegmentTags({ orgId, datasetId: resourceId, filter: {} }, callOptionsFromTrpcContext(ctx));
  }),
  paginatedTagList: viewDataProcedure
    .input(
      requiredOrgAndResourceSchema.extend({
        limit: z.number(),
        offset: z.number(),
      }),
    )
    .query(async ({ ctx, input: { resourceId, ...input } }) => {
      return getPaginatedSegmentKeys({ ...input, datasetId: resourceId }, callOptionsFromTrpcContext(ctx));
    }),
  listKeys: viewDataProcedure
    .input(
      requiredOrgAndResourceSchema.extend({
        tags: segmentTagsSchema,
      }),
    )
    .query(async ({ ctx, input: { orgId, resourceId: datasetId, tags } }) => {
      // TODO: add an API in Dataservice to fetch the list of keys
      const segments = await getSegmentTags({ orgId, datasetId, filter: {} }, callOptionsFromTrpcContext(ctx));
      const searchableTags = segments.flatMap((s) => s.segment?.tags).filter(notNullish);

      return filterSegmentTags(searchableTags, tags ?? [], 'key');
    }),
  listValueForKey: viewDataProcedure
    .input(
      requiredOrgAndResourceSchema.extend({
        key: z.string().max(128),
        tags: segmentTagsSchema,
      }),
    )
    .query(async ({ ctx, input }) => getSegmentsForKey(input, callOptionsFromTrpcContext(ctx))),
});

export default segments;

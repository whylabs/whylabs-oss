import { z } from 'zod';

import { Granularity } from '../util/enums';
import { requiredOrgAndResourceSchema, segmentTagsSchema } from '../util/schemas';

export const SingleProfileInsightsRequest = requiredOrgAndResourceSchema.extend({
  referenceProfileId: z.string().nullish(),
  batchProfileTimestamp: z.number().nullish(),
  segment: segmentTagsSchema,
  granularity: Granularity,
});

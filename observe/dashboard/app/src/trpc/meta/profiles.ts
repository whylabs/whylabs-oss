import { z } from 'zod';

import { getNumericMetricByReference } from '../../services/data/data-service/api-wrappers/numeric-metrics';
import { router, viewDataProcedure } from '../trpc';
import { callOptionsFromTrpcContext } from '../util/call-context';
import { requiredOrgAndResourceSchema, segmentTagsSchema } from '../util/schemas';

export const profiles = router({
  getReferenceProfileMetric: viewDataProcedure
    .input(
      requiredOrgAndResourceSchema.extend({
        column: z.string().min(1),
        metric: z.string().min(1),
        referenceProfileId: z.string().min(1),
        segment: segmentTagsSchema,
      }),
    )
    .query(async ({ ctx, input: { column, metric, orgId, referenceProfileId, resourceId, segment } }) => {
      const data = await getNumericMetricByReference(
        {
          orgId,
          columnName: column,
          datasetId: resourceId,
          metric,
          referenceId: referenceProfileId,
          segment,
        },
        callOptionsFromTrpcContext(ctx),
      );
      return data?.metricValue ?? null;
    }),
});

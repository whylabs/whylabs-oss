import path from 'path';

import { contractTimePeriodToGQL } from '../../graphql/contract-converters/songbird/model-converters';
import { InsightEntry } from '../../graphql/generated/graphql';
import { getLogger } from '../../providers/logger';
import { getProfileInsights } from '../../services/data/data-service/api-wrappers/insights';
import { SingleProfileInsightsRequest } from '../dto/insights.dto';
import { router, viewDataProcedure } from '../trpc';
import { callOptionsFromTrpcContext } from '../util/call-context';

const logger = getLogger(path.parse(__filename).name);

export const insights = router({
  getForSingleProfile: viewDataProcedure
    .input(SingleProfileInsightsRequest)
    .query(async ({ ctx, input }): Promise<InsightEntry[]> => {
      try {
        return await getProfileInsights(
          {
            ...input,
            granularity: contractTimePeriodToGQL(input.granularity),
          },
          callOptionsFromTrpcContext(ctx),
        );
      } catch (err) {
        logger.error(err, 'Failed to fetch profile insights Req: %s', JSON.stringify(input));
      }
      return [];
    }),
});

import { z } from 'zod';

import { modelMetadataToModel } from '../../graphql/contract-converters/songbird/model-converters';
import { AnomalyCount, GranularityInclusion, SortDirection, TimePeriod } from '../../graphql/generated/graphql';
import { getAnalyzerResults } from '../../services/data/data-service/api-wrappers/analyzer-results';
import { getAnomalyCount } from '../../services/data/data-service/api-wrappers/anomaly-counts';
import { getIntervalFromResource } from '../../services/data/data-service/api-wrappers/model-metrics';
import { getInterval } from '../../services/data/data-service/data-service-utils';
import { getModel } from '../../services/data/songbird/api-wrappers/resources';
import { CallOptions } from '../../util/async-helpers';
import { router, viewResourceDataProcedureWithDateInterval } from '../trpc';
import { callOptionsFromTrpcContext } from '../util/call-context';
import {
  analysisCommonInputSchema,
  analyzerResultsInputSchema,
  commonDateRangeInputSchema,
  paginatedSchema,
  withSegmentsSchema,
} from '../util/schemas';

const anomaliesCountInputSchema = withSegmentsSchema.merge(commonDateRangeInputSchema).merge(analysisCommonInputSchema);
const paginatedAnalyzerResultsInputSchema = paginatedSchema.merge(analyzerResultsInputSchema).merge(withSegmentsSchema);

export const analyzerResults = router({
  getPaginatedAnalysis: viewResourceDataProcedureWithDateInterval
    .input(paginatedAnalyzerResultsInputSchema)
    .query(
      async ({
        ctx,
        input: {
          analyzerIds,
          orgId,
          resourceId,
          fromTimestamp,
          toTimestamp,
          onlyAnomalies,
          granularityInclusion,
          limit,
          segment,
          offset,
        },
      }) => {
        const callOptions = callOptionsFromTrpcContext(ctx);

        const interval = await getIntervalFromResource({ orgId, resourceId, fromTimestamp, toTimestamp }, callOptions);

        const result = await getAnalyzerResults(
          {
            analyzerIDs: new Set(analyzerIds),
            datasetIds: new Set([resourceId]),
            includeFailed: false,
            interval,
            granularityInclusion: granularityInclusion ?? GranularityInclusion.IndividualOnly,
            anomaliesOnly: onlyAnomalies,
            sortDirection: SortDirection.Asc,
            segmentTags: segment,
            orgId,
            // Must know if there are more results to fetch than the limit
            limit: limit + 1,
            offset,
          },
          callOptions,
        );

        if (!result?.length) return { data: [], hasNextPage: false };

        // Map the results to output only the necessary data for the frontend
        const data = result.map((r) => ({
          datasetTimestamp: r.datasetTimestamp,
          metricValue: r.threshold_metricValue ?? null,
          segment: r.tags,
          traceIds: r.traceIds,
        }));

        // If there are more results than the limit, there are more pages
        if (data.length > limit) {
          return {
            data: data.splice(0, data.length - 1),
            hasNextPage: true,
          };
        }

        return { data, hasNextPage: false };
      },
    ),
  getAnomaliesCount: viewResourceDataProcedureWithDateInterval
    .input(anomaliesCountInputSchema)
    .query(async ({ ctx, input }) => {
      const { orgId, resourceId, granularityInclusion } = input;
      const callOptions = callOptionsFromTrpcContext(ctx);
      const resourceMetadata = await getModel(orgId, resourceId, callOptions);
      if (!resourceMetadata) return [];
      const resource = modelMetadataToModel(resourceMetadata);
      return getAnalyzerAnomaliesCount(
        {
          ...input,
          timePeriod: resource?.batchFrequency ?? TimePeriod.P1D,
          granularityInclusion: granularityInclusion ?? GranularityInclusion.IndividualOnly,
        },
        callOptions,
      );
    }),
});

export const getAnalyzerAnomaliesCount = async (
  {
    analyzerIds,
    orgId,
    resourceId,
    fromTimestamp,
    toTimestamp,
    timePeriod,
    segment,
    granularityInclusion,
  }: z.infer<typeof anomaliesCountInputSchema>,
  callOptions?: CallOptions,
): Promise<AnomalyCount[]> => {
  return getAnomalyCount(
    {
      analyzerIDs: analyzerIds,
      datasetID: resourceId,
      interval: getInterval(fromTimestamp, toTimestamp),
      timePeriod: timePeriod ?? TimePeriod.All,
      granularityInclusion: granularityInclusion ?? GranularityInclusion.IndividualOnly,
      segmentTags: segment,
      orgId,
    },
    callOptions,
  );
};

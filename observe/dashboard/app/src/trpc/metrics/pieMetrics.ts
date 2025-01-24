import { z } from 'zod';

import { modelMetadataToModel } from '../../graphql/contract-converters/songbird/model-converters';
import { TimePeriod } from '../../graphql/generated/graphql';
import { getProfilesByTimeRange } from '../../services/data/data-service/api-wrappers/profile-rollup';
import { getModel } from '../../services/data/songbird/api-wrappers/resources';
import { PieChartQuery } from '../dashboard/types/queries';
import { TrpcContext } from '../trpc';
import { callOptionsFromTrpcContext } from '../util/call-context';
import { intervalSchema, orgSchema } from '../util/schemas';
import { NameValue, PieSeries } from './types/simpleMetricsTypes';

type GetListReturnType = {
  series: PieSeries | null;
  timePeriod?: TimePeriod;
};

const commonSchema = orgSchema.merge(intervalSchema);

type CommonType = z.infer<typeof commonSchema>;

export const doSimplePieMetricsQuery = async (
  { columnName, fromTimestamp, orgId, queryId, resourceId, segment, toTimestamp }: CommonType & PieChartQuery,
  ctx: TrpcContext,
): Promise<GetListReturnType> => {
  if (!columnName) return { series: null };

  const callOptions = callOptionsFromTrpcContext(ctx);

  const resourceMetadata = await getModel(orgId, resourceId, callOptions);
  if (!resourceMetadata) return { series: null };

  const resource = modelMetadataToModel(resourceMetadata);
  const timePeriod = resource?.batchFrequency ?? TimePeriod.P1D;

  const result = await getProfilesByTimeRange(
    {
      orgId,
      datasetId: resourceId,
      fromTime: fromTimestamp,
      toTime: toTimestamp ?? null,
      timePeriod,
      segmentTags: segment ?? [],
    },
    [
      {
        featureName: columnName,
        metrics: [],
      },
    ],
    callOptions,
  );

  const mappedData = new Map<string, number>();

  result.forEach((item) => {
    item.frequentItems.forEach(({ estimate, value }) => {
      if (!value) return;

      const valueToAdd = estimate ?? 0;

      if (mappedData.has(value)) {
        const current = mappedData.get(value) ?? 0;
        mappedData.set(value, current + valueToAdd);
      } else {
        mappedData.set(value, valueToAdd);
      }
    });
  });

  // Sort by value descending
  const sortedData = [...mappedData.entries()].sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));

  const data: NameValue[] = [];
  let otherTotal = 0;

  // Only show the top 5 values, the rest will be grouped into 'Other'
  sortedData.forEach(([name, value], index) => {
    if (index < 5) {
      data.push({ name, value });
    } else {
      otherTotal += value ?? 0;
    }
  });

  // If there are any 'Other' values, add them to the data
  if (otherTotal > 0) {
    data.push({ name: 'Other', value: otherTotal });
  }

  data.sort((a, b) => b.value - a.value);

  return {
    series: {
      column: columnName,
      data,
      queryId: queryId,
      resourceId: resourceId,
      segment: segment ?? [],
      type: 'pie',
    },
  };
};

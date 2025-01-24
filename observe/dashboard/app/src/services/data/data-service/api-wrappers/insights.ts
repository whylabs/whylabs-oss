import { GetSingleProfileInsights } from '@whylabs/data-service-node-client';

import { InsightEntry, SegmentTag, TimePeriod } from '../../../../graphql/generated/graphql';
import { CallOptions, addToContext, axiosCallConfig, tryCall } from '../../../../util/async-helpers';
import { dataServiceClient } from '../data-service-client-factory';
import { getDataServiceGranularity, getIntervalWithDuration } from '../data-service-utils';

interface GetProfileInsightsProps {
  resourceId: string;
  orgId: string;
  referenceProfileId?: string | null;
  batchProfileTimestamp?: number | null;
  segment: SegmentTag[];
  granularity: TimePeriod;
}
export const getProfileInsights = async (
  { resourceId, orgId, segment, batchProfileTimestamp, referenceProfileId, granularity }: GetProfileInsightsProps,
  options?: CallOptions,
): Promise<InsightEntry[]> => {
  const reqParams: GetSingleProfileInsights = {
    datasetId: resourceId,
    orgId,
    segment: { tags: segment },
    granularity: getDataServiceGranularity(granularity),
  };

  if (batchProfileTimestamp) {
    reqParams.interval = getIntervalWithDuration(batchProfileTimestamp, granularity);
  } else if (referenceProfileId) {
    reqParams.refProfileId = referenceProfileId;
  }
  const client = options?.context?.dataServiceClient ?? dataServiceClient;
  options = addToContext({ datasetId: resourceId }, options);
  return (await tryCall(() => client.profiles.singleProfileInsight(reqParams, axiosCallConfig(options)), options)).data;
};

import { ColumnNameListRequest } from '@whylabs/data-service-node-client';

import { SegmentTag, TimePeriod } from '../../../../graphql/generated/graphql';
import { CallOptions, axiosCallConfig, tryCall } from '../../../../util/async-helpers';
import { isValidNumber } from '../../../../util/type-guards';
import { dataServiceClient } from '../data-service-client-factory';
import { getInterval, getIntervalWithDuration } from '../data-service-utils';

export type GetActiveColumnsRequest = {
  orgId: string;
  datasetId: string;
  granularity?: TimePeriod; // this will constrain the amount of data looked at
  segmentTags: SegmentTag[];
  fromTimestamp?: number;
  toTimestamp?: number; // if toTimestamp is null, a single batch is required
  referenceProfileId?: string;
};

export const getActiveColumns = async (params: GetActiveColumnsRequest, options?: CallOptions): Promise<string[]> => {
  const { orgId, datasetId, fromTimestamp, toTimestamp, granularity, segmentTags, referenceProfileId } = params;
  const interval = (() => {
    if (isValidNumber(fromTimestamp) && isValidNumber(toTimestamp)) {
      return getInterval(fromTimestamp, toTimestamp);
    }
    if (isValidNumber(fromTimestamp) && granularity) {
      return getIntervalWithDuration(fromTimestamp, granularity);
    }
    return getInterval(fromTimestamp ?? 0, Date.now());
  })();

  const reqParams: ColumnNameListRequest = {
    datasetId,
    orgId,
    segment: segmentTags,
    interval,
    refProfileId: referenceProfileId,
  };

  const client = options?.context?.dataServiceClient ?? dataServiceClient;
  return (await tryCall(() => client.profiles.getActiveColumns(reqParams, axiosCallConfig(options)), options)).data;
};

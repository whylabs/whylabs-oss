import { TimeBoundaryQuery } from '@whylabs/data-service-node-client';
import { chunk } from 'lodash';

import { DataAvailability, DateRange, SegmentTag, TimePeriod } from '../../../../graphql/generated/graphql';
import { CallOptions, axiosCallConfig, tryCall } from '../../../../util/async-helpers';
import { ifNotEmpty, notNullish } from '../../../../util/misc';
import { BatchableRequest } from '../../data-utils';
import { dataServiceClient } from '../data-service-client-factory';
import { getDataServiceGranularity, timePeriodToMillis, truncateDatasetIds } from '../data-service-utils';
import { getBatchDateRange } from './batch-metadata';

export type DatasetId = string | null; // null dataset ID is, unfortunately, something that does happen
export type DataAvailabilityByDataset = Map<DatasetId, DataAvailability>;

export type DataAvailabilityRequest = BatchableRequest<DataAvailabilityRequestKey, DataAvailabilityRequestParams>;

export type DataAvailabilityRequestKey = {
  orgId: string;
  tags?: SegmentTag[];
  timePeriod: TimePeriod;
};

export type DataAvailabilityRequestParams = {
  datasetId: string;
};

export const defaultDataAvailability: DataAvailability = { hasData: false };

export const getDataAvailability = async (
  key: DataAvailabilityRequestKey,
  params: DataAvailabilityRequestParams[],
  options?: CallOptions,
): Promise<DataAvailabilityByDataset> => {
  // Note do not rely on generated types as typing things possibly null/undefined is just too much for open api generators
  // truncate calls with more than 300 models
  params.map((p) => p.datasetId);
  const truncatedDatasetIds = truncateDatasetIds(
    params.map((p) => p.datasetId),
    300, // we'll query up to 100 at time, so max of 3 sync calls
    options?.context,
  );
  const datasetIdsChunks = chunk(truncatedDatasetIds, 100);
  const result = new Map<DatasetId, DataAvailability>();
  const availabilityHandlerCallback = async (datasetIds: string[]) => {
    const req: TimeBoundaryQuery = {
      orgId: key.orgId,
      datasetIds,
      segment: ifNotEmpty(key.tags),
      granularity: getDataServiceGranularity(key.timePeriod),
    };
    const client = options?.context?.dataServiceClient ?? dataServiceClient;
    const { data } = await tryCall(() => client.profiles.timeBoundary(req, axiosCallConfig(options)), options);
    for (const row of data.rows ?? []) {
      result.set(row.datasetId, {
        hasData: notNullish(row.start) && notNullish(row.end), // the dataset has data if it has timestamps
        oldestTimestamp: row.start,
        latestTimestamp: row.end,
      });
    }
  };

  for (const chunk of datasetIdsChunks) {
    await availabilityHandlerCallback(chunk);
  }

  return result;
};

export const getProfileRangeByTimestamp = async (
  orgId: string,
  datasetId: string,
  batchFrequency: TimePeriod,
  timestamp: number,
  options?: CallOptions,
): Promise<DateRange | null> => {
  const approxBatchMillis = timePeriodToMillis(batchFrequency);
  const overFetchToTime = timestamp + approxBatchMillis + 1;
  const req = {
    orgId,
    datasetId,
    fromTime: timestamp,
    toTime: overFetchToTime,
    timePeriod: batchFrequency,
  };
  return getBatchDateRange(req, options);
};

export const filterDataAvailability = (
  param: DataAvailabilityRequestParams,
  possibleResult: Map<DatasetId, DataAvailability> | null,
): DataAvailability => possibleResult?.get(param.datasetId) ?? defaultDataAvailability;

import { GetLatestAnomalyQuery } from '@whylabs/data-service-node-client';
import { uniq } from 'ramda';

import { CallOptions, axiosCallConfig, tryCall } from '../../../../util/async-helpers';
import { dataServiceClient } from '../data-service-client-factory';
import { getInterval, tagsToDataServiceSegment, truncateDatasetIds } from '../data-service-utils';
import {
  GetLatestAnomalyRequestKey,
  GetLatestAnomalyRequestParams,
  readPostgresMonitor,
} from '../queries/analysis-queries';

export type DatasetID = string | null; // dataset ID might be missing in the response, if the profiles are malformed
export type LatestAnomalyByDataset = Map<DatasetID, number | null>;

export const fetchLatestAnomalies = async (
  key: GetLatestAnomalyRequestKey,
  params: GetLatestAnomalyRequestParams[],
  options?: CallOptions,
): Promise<LatestAnomalyByDataset> => {
  const datasetIds = truncateDatasetIds(uniq(params.map((p) => p.datasetId)), 100, options?.context);
  const req: GetLatestAnomalyQuery = {
    orgId: key.orgId,
    datasetIds,
    segments: [tagsToDataServiceSegment(key.tags)],
    columnNames: key.column ? [key.column] : undefined,
    analyzerIds: key.analyzerIDs ?? undefined,
    monitorIds: key.monitorIDs ?? undefined,
    interval: getInterval(0, key.requestTime),
    readPgMonitor: await readPostgresMonitor(key.orgId, options),
  };
  const client = options?.context?.dataServiceClient ?? dataServiceClient;
  const { data } = await tryCall(() => client.analysis.getLatestAnomalyQuery(req, axiosCallConfig(options)), options);

  const results = new Map<DatasetID, number | null>();
  data.forEach(({ datasetId, latest }) => results.set(datasetId, latest));

  return results;
};

export const filterLatestAnomalies = (
  param: GetLatestAnomalyRequestParams,
  possibleResult: LatestAnomalyByDataset | null,
): number | null => possibleResult?.get(param.datasetId) ?? null;

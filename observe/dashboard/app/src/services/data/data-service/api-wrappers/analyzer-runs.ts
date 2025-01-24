import { analyzerRunToGql } from '../../../../graphql/contract-converters/data-service/analyzer-runs-converter';
import { AnalyzerRunCountResult, AnalyzerRunResult } from '../../../../graphql/generated/graphql';
import { CallOptions, axiosCallConfig, tryCall } from '../../../../util/async-helpers';
import { dataServiceClient } from '../data-service-client-factory';
import { readPostgresMonitor } from '../queries/analysis-queries';
import {
  GetAnalyzerRunRequest,
  GetPaginatedRunsRequest,
  getAnalyzerRunCountQuery,
  getPaginatedRunsQuery,
} from '../queries/runs-queries';

export const getPaginatedRuns = async (
  params: GetPaginatedRunsRequest,
  options?: CallOptions,
): Promise<AnalyzerRunResult[]> => {
  const client = options?.context?.dataServiceClient ?? dataServiceClient;
  const query = getPaginatedRunsQuery(params);
  query.readPgMonitor = await readPostgresMonitor(params.orgId, options);
  const results = await tryCall(() => client.analysis.getAnalyzerRuns(query, axiosCallConfig(options)), options);
  const data = results.data ?? [];
  return data.map(analyzerRunToGql);
};

export const getAnalyzerRunCount = async (
  params: GetAnalyzerRunRequest,
  options?: CallOptions,
): Promise<AnalyzerRunCountResult> => {
  const client = options?.context?.dataServiceClient ?? dataServiceClient;
  const query = getAnalyzerRunCountQuery(params);
  query.readPgMonitor = await readPostgresMonitor(params.orgId, options);
  const results = await tryCall(() => client.analysis.getAnalyzerRunCount(query, axiosCallConfig(options)), options);

  return {
    count: results.data?.count ?? 0,
    datasetId: params.datasetId,
    orgId: params.orgId,
  };
};

import { GetAnalyzerResultRequest } from '@whylabs/data-service-node-client';

import { analyzerResultsToGql } from '../../../../graphql/contract-converters/data-service/analyzer-results-converter';
import { filterAnalysisResults } from '../../../../graphql/filters/analysis-filters';
import { AnalysisResult } from '../../../../graphql/generated/graphql';
import { CallOptions, axiosCallConfig, tryCall } from '../../../../util/async-helpers';
import { OperationContext } from '../../../../util/misc';
import { dataServiceClient } from '../data-service-client-factory';
import {
  GetAnalysisRequest,
  GetAnalysisRequestKey,
  GetAnalysisRequestParams,
  SetFalseAlarmRequest,
  readPostgresMonitor,
} from '../queries/analysis-queries';
import { getAnalyzerResultsQuery } from '../queries/analysis-queries';

export const getAnalyzerResults = async (req: GetAnalysisRequest, options?: CallOptions): Promise<AnalysisResult[]> => {
  return getBatchedAnalyzerResults(req, [req], options);
};
export const getBatchedAnalyzerResults = async (
  key: GetAnalysisRequestKey,
  params: GetAnalysisRequestParams[],
  options?: CallOptions,
): Promise<AnalysisResult[]> => {
  const client = options?.context?.dataServiceClient ?? dataServiceClient;
  const query: GetAnalyzerResultRequest = getAnalyzerResultsQuery(key, params);
  query.readPgMonitor = await readPostgresMonitor(key.orgId, options);
  const opContext: OperationContext = { orgId: key.orgId, dataType: 'anomaly' };
  const results = await tryCall(() => client.analysis.getAnalyzerResults(query, axiosCallConfig(options)), options);
  const data = results.data ?? [];
  return data.map((r) => analyzerResultsToGql(opContext, r));
};

export const filterAnalyzerResults = (
  params: GetAnalysisRequestParams,
  results: AnalysisResult[] | null,
): AnalysisResult[] => filterAnalysisResults(results ?? [], params);

export const setFalseAlarm = async (req: SetFalseAlarmRequest, options?: CallOptions): Promise<void> => {
  const client = options?.context?.dataServiceClient ?? dataServiceClient;
  await tryCall(
    () => client.analysis.markUnhelpful(req.isUnhelpful, req.analysisId, axiosCallConfig(options)),
    options,
  );
};

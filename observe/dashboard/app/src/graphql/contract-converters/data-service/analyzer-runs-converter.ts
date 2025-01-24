import { AnalyzerRun } from '@whylabs/data-service-node-client';

import { AnalyzerRunResult } from '../../generated/graphql';

export const analyzerRunToGql = (result: AnalyzerRun): AnalyzerRunResult => {
  return {
    analyzerId: result.analyzerId,
    anomalyCount: result.anomalies,
    columnCount: result.columnsAnalyzed,
    datasetId: result.datasetId,
    failureTypes: result.failureTypes,
    monitorIds: result.monitorIds,
    orgId: result.orgId,
    runId: result.runId,
    runCompleted: result.completedTs,
    runStarted: result.startedTs,
  };
};

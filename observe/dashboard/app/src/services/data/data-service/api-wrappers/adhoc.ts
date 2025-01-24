import {
  AdHocMonitorRequestV3,
  AsyncAnalysisQueue,
  AsyncRequest,
  BackfillRequest,
  GetAdHocRunNumEventsRequest,
  GetAsyncRequests,
  StatusEnum,
} from '@whylabs/data-service-node-client';
import { AxiosResponse } from 'axios';

import {
  AdHocMonitorJob,
  BackfillAnalyzersJob,
  BackfillJobInfo,
  BackfillJobStatus,
} from '../../../../graphql/generated/graphql';
import { getLogger } from '../../../../providers/logger';
import { CallOptions, axiosCallConfig, tryCall } from '../../../../util/async-helpers';
import { isString } from '../../../../util/type-guards';
import { PartialMonitorConfig } from '../../monitor/coverage';
import { getMonitorConfigV3 } from '../../songbird/api-wrappers/monitor-config';
import { dataServiceClient } from '../data-service-client-factory';
import { intervalToDateRange } from '../data-service-utils';
import { readPostgresMonitor } from '../queries/analysis-queries';

const logger = getLogger('AdhocApi');

export const runAdhocAnalyzers = async (
  request: AdHocMonitorRequestV3,
  options?: CallOptions,
): Promise<AdHocMonitorJob> => {
  const client = options?.context?.dataServiceClient ?? dataServiceClient;
  const result = await tryCall(
    () => client.analysis.triggerV3AnalyzerPostgres(request, axiosCallConfig(options)),
    options,
  );
  return { numEvents: result.data.numEventsProduced ?? 0, runId: result.data.runId ?? '' };
};

export const runBackfillAnalyzers = async (
  request: BackfillRequest,
  options?: CallOptions,
): Promise<BackfillAnalyzersJob> => {
  const client = options?.context?.dataServiceClient ?? dataServiceClient;
  if (await readPostgresMonitor(request.orgId, options)) {
    request.queue = AsyncAnalysisQueue.Backfill;
  }
  const result = await tryCall(() => client.analysisAsync.triggerBackfill(request, axiosCallConfig(options)), options);
  return { runId: result.data ?? '' };
};

export const cancelBackfillAnalyzersJob = async (runId: string, options?: CallOptions): Promise<BackfillJobStatus> => {
  const client = options?.context?.dataServiceClient ?? dataServiceClient;
  await tryCall(() => client.analysisAsync.cancelAsyncAdhocRequest(runId, axiosCallConfig(options)), options);
  return BackfillJobStatus.Canceled;
};

export const getBackfillAnalyzersJobStatus = async (
  runId: string,
  options?: CallOptions,
): Promise<BackfillJobStatus> => {
  const client = options?.context?.dataServiceClient ?? dataServiceClient;
  const result = await tryCall(() => client.analysisAsync.getStatus(runId, axiosCallConfig(options)), options);
  return backfillStatusMap.get(result.data.status) ?? BackfillJobStatus.Unknown;
};

const mapAnalyzerIdsFromStringConfig = (config: string): string[] => {
  try {
    if (!config) return []; // there's no config when the job is in planning state
    const parsedConfig = JSON.parse(config);
    if (!Array.isArray(parsedConfig)) return [];
    return parsedConfig.flatMap(({ id }) => (isString(id) ? id : []));
  } catch (e) {
    logger.error(`Error parsing the analyzerConfig: ${config} - ${e}`);
    return [];
  }
};

export const getResourceBackfillAnalyzersJobs = async (
  params: GetAsyncRequests,
  options?: CallOptions,
): Promise<BackfillJobInfo[]> => {
  const client = options?.context?.dataServiceClient ?? dataServiceClient;
  if (params.orgId && (await readPostgresMonitor(params.orgId, options))) {
    params.queue = AsyncAnalysisQueue.Backfill;
  }
  const { orgId, datasetId } = params;
  const promises: [Promise<AxiosResponse<AsyncRequest[]>>, Promise<PartialMonitorConfig | null> | undefined] = [
    tryCall(() => client.analysisAsync.queryAsyncRequests(params, axiosCallConfig(options)), options),
    undefined,
  ];
  if (orgId && datasetId) {
    promises[1] = tryCall(() => getMonitorConfigV3(orgId, datasetId, false, false, options), options);
  }
  const [backfillRequests, monitorSchema] = await Promise.all(promises);
  return backfillRequests?.data?.map((job) => {
    const { monitors } = monitorSchema ?? {};
    const jobAnalyzers = mapAnalyzerIdsFromStringConfig(job.analyzersConfigs ?? '');
    const jobMonitors = monitors
      ?.filter((config) => config.analyzerIds.find((monitorAnalyzer) => jobAnalyzers.includes(monitorAnalyzer)))
      ?.flatMap(({ id, displayName }) => {
        const usedName = displayName || id;
        return usedName || [];
      });
    return {
      status: backfillStatusMap.get(job.status) ?? BackfillJobStatus.Unknown,
      runId: job.runId,
      duration: intervalToDateRange(job.backfillInterval),
      monitorsList: jobMonitors ?? [],
      progress: ((job.tasksComplete ?? 0) / (job.tasks || 1)) * 100,
      columns: job.features || 0,
      segments: job.segments || 0,
      datasetId: job.datasetId ?? '',
    };
  });
};

export const getAdHocRunNumEvents = async (
  params: GetAdHocRunNumEventsRequest,
  options?: CallOptions,
): Promise<number> => {
  const client = options?.context?.dataServiceClient ?? dataServiceClient;
  const { data } = await tryCall(() => client.analysis.getAdHocRunNumEvents(params, axiosCallConfig(options)), options);

  return data.numAdHocEvents;
};

const backfillStatusMap = new Map<StatusEnum, BackfillJobStatus>([
  [StatusEnum.Pending, BackfillJobStatus.Pending],
  [StatusEnum.Planning, BackfillJobStatus.Planning],
  [StatusEnum.Executing, BackfillJobStatus.Executing],
  [StatusEnum.WritingResults, BackfillJobStatus.WritingResults],
  [StatusEnum.Successful, BackfillJobStatus.Successful],
  [StatusEnum.Failed, BackfillJobStatus.Failed],
  [StatusEnum.Canceled, BackfillJobStatus.Canceled],
]);

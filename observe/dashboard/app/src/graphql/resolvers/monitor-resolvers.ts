import { IResolvers } from '@graphql-tools/utils';
import { AdHocMonitorRequestV3, BackfillRequest, MonitorConfigV3 } from '@whylabs/data-service-node-client';

import { AdhocMonitorRunError } from '../../errors/dashbird-error';
import { getInterval } from '../../services/data/data-service/data-service-utils';
import {
  deleteAnalyzer,
  deleteMonitor,
  getMonitorConfigV3,
  patchMonitorConfigV3,
  putAnalyzer,
  putMonitor,
  putMonitorConfigV3,
  targetMatrixColumnsEvaluator,
  validateMonitorConfigV3,
} from '../../services/data/songbird/api-wrappers/monitor-config';
import { CallOptions, callOptionsFromGraphqlCxt, timeout, whylabsCxtFromGraphqlCxt } from '../../util/async-helpers';
import { FullGraphQLContext } from '../context';
import { Resolvers } from '../generated/graphql';
import { runAdhoc, runBackfillJob, setupTimeStrings } from './helpers/adhoc';

const configCallOptions = (datasetId: string, context: FullGraphQLContext): CallOptions => {
  const options = callOptionsFromGraphqlCxt(context);
  const callCtx = whylabsCxtFromGraphqlCxt(context);
  const opCtx = options.context?.operationContext ?? {};
  opCtx.datasetId = datasetId;
  opCtx.dataType = 'monitorConfig';
  callCtx.operationContext = opCtx;
  return options;
};

const resolvers: Resolvers<FullGraphQLContext> = {
  MonitorSettingsManagement: {
    updateMonitorConfig: async (parent, args, context): Promise<boolean> => {
      const { datasetId, config } = args;
      await putMonitorConfigV3(context.resolveUserOrgID(), datasetId, config, configCallOptions(datasetId, context));
      return true;
    },
    patchMonitorConfig: async (parent, args, context): Promise<boolean> => {
      const { datasetId, config } = args;
      await patchMonitorConfigV3(context.resolveUserOrgID(), datasetId, config, configCallOptions(datasetId, context));
      return true;
    },
    updateAnalyzer: async (parent, args, context): Promise<boolean> => {
      const { datasetId, analyzerId, config } = args;
      await putAnalyzer(
        context.resolveUserOrgID(),
        datasetId,
        analyzerId,
        config,
        configCallOptions(datasetId, context),
      );
      return true;
    },
    updateMonitor: async (parent, args, context): Promise<boolean> => {
      const { datasetId, monitorId, config } = args;
      await putMonitor(context.resolveUserOrgID(), datasetId, monitorId, config, configCallOptions(datasetId, context));
      return true;
    },
    deleteAnalyzer: async (parent, args, context): Promise<boolean> => {
      const { datasetId, analyzerId } = args;
      await deleteAnalyzer(context.resolveUserOrgID(), datasetId, analyzerId, configCallOptions(datasetId, context));
      return true;
    },
    deleteMonitor: async (parent, args, context): Promise<boolean> => {
      const { datasetId, monitorId } = args;
      await deleteMonitor(context.resolveUserOrgID(), datasetId, monitorId, configCallOptions(datasetId, context));
      return true;
    },
  },
  AdHocMonitorMutations: {
    run: async (parent, args, context) => {
      const { datasetId, features, segments, toTimestamp, fromTimestamp, monitorConfig } = args;
      const { resolveUserOrgID, requestTime, dataSources } = context;
      const orgId = resolveUserOrgID();

      // fetch the current monitor config in full (with entity schema and entity weights)
      const currentConfig = await getMonitorConfigV3(
        orgId,
        datasetId,
        true,
        true,
        configCallOptions(datasetId, context),
      );

      // validate user supplied config, if any
      const userSuppliedConfig = await validateMonitorConfigV3(
        orgId,
        datasetId,
        monitorConfig ?? undefined,
        configCallOptions(datasetId, context),
      );

      const { analyzers } = (userSuppliedConfig ?? {}) as MonitorConfigV3;
      const targetMatrixRequests =
        analyzers?.map(({ targetMatrix }) =>
          targetMatrixColumnsEvaluator(orgId, datasetId, targetMatrix, callOptionsFromGraphqlCxt(context)),
        ) ?? [];
      // merge the user-supplied config into the original one, so that we keep any existing entity schema / feature weight definitions
      const config = { ...currentConfig, ...userSuppliedConfig };
      if (!config) throw new AdhocMonitorRunError('Monitor preview run failed. No monitor configuration is available.');

      // These adhoc monitor jobs shouldn't take more than 5 minutes. If they do, something is seriously wrong somewhere.
      const timeoutSeconds = 5 * 60;
      const [start, end] = setupTimeStrings(fromTimestamp, toTimestamp ?? requestTime);

      const request: AdHocMonitorRequestV3 = {
        inlineResults: false,
        segmentTags: segments ?? [],
        columnNames: features,
        start,
        end,
        monitorConfig: config as MonitorConfigV3,
      };
      const adhocRequest = timeout(
        runAdhoc(orgId, datasetId, request, dataSources.dataService.runAdhocAnalyzers),
        timeoutSeconds * 1000,
      );

      const [previewResponse, ...targetMatrixResponses] = await Promise.all([adhocRequest, ...targetMatrixRequests]);
      const targetedColumns = features.filter(
        (f) => !userSuppliedConfig || targetMatrixResponses.some((featuresSet) => featuresSet.has(f)),
      );
      return {
        ...previewResponse,
        columns: features?.length ? targetedColumns : null,
      };
    },
  },
  BackfillAnalyzersMutations: {
    triggerBackfill: async (parent, args, context) => {
      const { datasetId, analyzerIds, fromTimestamp, toTimestamp } = args;
      const orgId = context.resolveUserOrgID();
      const request: BackfillRequest = {
        orgId,
        datasetId,
        analyzerIds: analyzerIds ?? undefined,
        interval: getInterval(fromTimestamp, toTimestamp),
      };
      return runBackfillJob(request, context);
    },
    cancelJob: async (_, { runId }, context) => {
      return context.dataSources.dataService.cancelBackfillAnalyzersJob(runId, callOptionsFromGraphqlCxt(context));
    },
  },
};

export default resolvers as IResolvers;

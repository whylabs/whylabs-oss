import { Analyzer } from '../../../../schemas/generated/monitor-schema';
import { CallOptions, addToContext, axiosCallConfig, tryExecute } from '../../../../util/async-helpers';
import { MonitorConfigValidationError } from '../../../errors/songbird-service-errors';
import { dataServiceClient } from '../../data-service/data-service-client-factory';
import { PartialMonitorConfig } from '../../monitor/coverage';
import { songbirdClient } from '../songbird-client-factory';
import { logger, tryGetMetadata, tryValidateMetadata, tryWriteMetadata } from './utils';

export const getConstraints = async (
  orgId: string,
  datasetId: string,
  options?: CallOptions,
): Promise<string[] | null> => {
  logger.info('Fetching constraints for org %s, dataset %s', orgId, datasetId);
  const client = options?.context?.songbirdClient ?? songbirdClient;
  options = addToContext({ datasetId }, options);
  return tryGetMetadata(
    () => client.monitors.listConstraints(orgId, datasetId, axiosCallConfig(options)),
    true,
    options?.context,
  );
};
export const getMonitor = async (
  orgId: string,
  datasetId: string,
  monitorId: string,
  options?: CallOptions,
): Promise<string | null> => {
  logger.info('Fetching monitor for org %s, dataset %s, monitor %s', orgId, datasetId, monitorId);
  const client = options?.context?.songbirdClient ?? songbirdClient;
  options = addToContext({ datasetId }, options);
  return tryGetMetadata(
    () => client.monitors.getMonitor(orgId, datasetId, monitorId, axiosCallConfig(options)),
    true,
    options?.context,
  );
};
export const deleteMonitor = async (
  orgId: string,
  datasetId: string,
  monitorId: string,
  options?: CallOptions,
): Promise<void> => {
  logger.info('Deleting monitor for org %s, dataset %s, monitor %s');
  const client = options?.context?.songbirdClient ?? songbirdClient;
  options = addToContext({ datasetId }, options);
  await tryWriteMetadata(
    () => client.monitors.deleteMonitor(orgId, datasetId, monitorId, axiosCallConfig(options)),
    options,
  );
};
export const putMonitor = async (
  orgId: string,
  datasetId: string,
  monitorId: string,
  config: string,
  options?: CallOptions,
): Promise<void> => {
  logger.info('Saving monitor for org %s, dataset %s, monitor %s', orgId, datasetId, monitorId);
  const client = options?.context?.songbirdClient ?? songbirdClient;
  options = addToContext({ datasetId }, options);
  await tryWriteMetadata(
    () => client.monitors.putMonitor(orgId, datasetId, monitorId, config, axiosCallConfig(options)),
    options,
  );
};
export const getAnalyzer = async (
  orgId: string,
  datasetId: string,
  analyzerId: string,
  options?: CallOptions,
): Promise<string | null> => {
  logger.info('Fetching analyzer for org %s, dataset %s, analyzer %s', orgId, datasetId, analyzerId);
  const client = options?.context?.songbirdClient ?? songbirdClient;
  options = addToContext({ datasetId }, options);
  return tryGetMetadata(
    () => client.monitors.getAnalyzer(orgId, datasetId, analyzerId, axiosCallConfig(options)),
    true,
    options?.context,
  );
};
export const deleteAnalyzer = async (
  orgId: string,
  datasetId: string,
  analyzerId: string,
  options?: CallOptions,
): Promise<void> => {
  logger.info('Deleting analyzer for org %s, dataset %s, analyzer %s');
  const client = options?.context?.songbirdClient ?? songbirdClient;
  options = addToContext({ datasetId }, options);
  await tryWriteMetadata(
    () => client.monitors.deleteAnalyzer(orgId, datasetId, analyzerId, axiosCallConfig(options)),
    options,
  );
};
export const putAnalyzer = async (
  orgId: string,
  datasetId: string,
  analyzerId: string,
  config: string,
  options?: CallOptions,
): Promise<void> => {
  logger.info('Saving analyzer for org %s, dataset %s, analyzer %s', orgId, datasetId, analyzerId);
  const client = options?.context?.songbirdClient ?? songbirdClient;
  options = addToContext({ datasetId }, options);
  await tryWriteMetadata(
    () => client.monitors.putAnalyzer(orgId, datasetId, analyzerId, config, axiosCallConfig(options)),
    options,
  );
};
/**
 * Fetch the monitor config for the given org/dataset
 * By default, only monitor config is returned.
 * Entity schema, weights, and other metadata is omitted and must be requested explicitly if it's required.
 * @param orgId
 * @param datasetId
 * @param includeEntitySchema Whether to request entity schema
 * @param includeEntityWeights Whether to request entity weights
 */
export const getMonitorConfigV3 = async (
  orgId: string,
  datasetId: string,
  includeEntitySchema = false,
  includeEntityWeights = false,
  options?: CallOptions,
): Promise<PartialMonitorConfig | null> => {
  logger.info('Fetching monitor config for org %s, dataset %s', orgId, datasetId);
  const client = options?.context?.songbirdClient ?? songbirdClient;
  options = addToContext({ datasetId }, options);
  const config = await tryGetMetadata(
    () =>
      client.monitors.getMonitorConfigV3(
        orgId,
        datasetId,
        includeEntitySchema,
        includeEntityWeights,
        axiosCallConfig(options),
      ),
    true,
    options?.context,
  );

  // Songbird node client is actually returning the parsed JSON object not a string
  return config as unknown as Record<string, unknown> | null;
};
export const putMonitorConfigV3 = async (
  orgId: string,
  datasetId: string,
  config: string,
  options?: CallOptions,
): Promise<void> => {
  logger.info('Saving monitor config for org %s, dataset %s', orgId, datasetId);
  const client = options?.context?.songbirdClient ?? songbirdClient;
  options = addToContext({ datasetId }, options);
  await tryWriteMetadata(
    () => client.monitors.putMonitorConfigV3(orgId, datasetId, config, axiosCallConfig(options)),
    options,
  );
};
export const patchMonitorConfigV3 = async (
  orgId: string,
  datasetId: string,
  config: string,
  options?: CallOptions,
): Promise<void> => {
  logger.info('Saving monitor config for org %s, dataset %s', orgId, datasetId);
  const client = options?.context?.songbirdClient ?? songbirdClient;
  options = addToContext({ datasetId }, options);
  await tryWriteMetadata(
    () => client.monitors.patchMonitorConfigV3(orgId, datasetId, config, axiosCallConfig(options)),
    options,
  );
};
export const validateMonitorConfigV3 = async (
  orgId: string,
  datasetId: string,
  config?: string,
  options?: CallOptions,
): Promise<Record<string, unknown> | null> => {
  if (!config) {
    return null;
  }
  logger.info('Validating monitor config for org %s, dataset %s', orgId, datasetId);
  let parsedConfig = null;
  try {
    parsedConfig = JSON.parse(config);
  } catch (e) {
    if (e instanceof SyntaxError) {
      throw new MonitorConfigValidationError(`Invalid JSON for monitor config: ${e.message}`);
    }
    throw e;
  }
  const client = options?.context?.songbirdClient ?? songbirdClient;
  options = addToContext({ datasetId }, options);
  await tryValidateMetadata(
    () => client.monitors.validateMonitorConfigV3(orgId, datasetId, config, undefined, axiosCallConfig(options)),
    options,
  );
  return parsedConfig;
};

export const listConstraints = async (
  orgId: string,
  datasetId: string,
  options?: CallOptions,
): Promise<(Record<string, unknown> | null)[]> => {
  const client = options?.context?.songbirdClient ?? songbirdClient;
  options = addToContext({ datasetId }, options);
  const constraintsAsString = await tryExecute(() =>
    client.monitors.listConstraints(orgId, datasetId, axiosCallConfig(options)),
  );
  if (!constraintsAsString) return [];

  try {
    return constraintsAsString.map((config) => JSON.parse(config));
  } catch (e) {
    if (e instanceof SyntaxError) {
      throw new MonitorConfigValidationError(`Invalid JSON for monitor constraints config: ${e.message}`);
    }
    throw e;
  }
};

export const targetMatrixColumnsEvaluator = async (
  orgId: string,
  datasetId: string,
  targetMatrix: Analyzer['targetMatrix'],
  options?: CallOptions,
): Promise<Set<string>> => {
  const client = options?.context?.dataServiceClient ?? dataServiceClient;
  options = addToContext({ datasetId }, options);
  const result = await tryExecute(() =>
    client.analysis.targetMatrixEvaluator(
      {
        orgId,
        datasetId,
        targetMatrix,
      },
      axiosCallConfig(options),
    ),
  );

  return new Set(result?.columns ?? []);
};

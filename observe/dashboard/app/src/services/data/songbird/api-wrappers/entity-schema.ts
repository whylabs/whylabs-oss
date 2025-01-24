import { DiscretenessType } from '@whylabs/data-service-node-client';
import { ColumnSchema, SegmentWeight, EntitySchema as SongbirdEntitySchema } from '@whylabs/songbird-node-client';

import { FeatureWeight, SegmentTag } from '../../../../graphql/generated/graphql';
import { CallOptions, addToContext, axiosCallConfig, tryExecute } from '../../../../util/async-helpers';
import { BatchableRequest } from '../../data-utils';
import { IndexedEntitySchema } from '../../datasources/helpers/entity-schema';
import { songbirdClient } from '../songbird-client-factory';
import { logger, tryWriteMetadata } from './utils';

// Intended to be temporary feature flagging
export const useCachedEntitySchema = async (orgId: string, options?: CallOptions): Promise<boolean> => {
  return true;
};

/**
 * Persists the provided schema for the specified column/feature
 * @param orgId
 * @param datasetId
 * @param columnName
 * @param columnSchema
 * @param options
 */
export const saveColumnSchema = async (
  orgId: string,
  datasetId: string,
  columnName: string,
  columnSchema: ColumnSchema,
  options?: CallOptions,
): Promise<void> => {
  logger.debug('Updating column %s in dataset %s, org %s', columnName, datasetId, orgId);
  const client = options?.context?.songbirdClient ?? songbirdClient;
  await tryWriteMetadata(
    () => client.models.putEntitySchemaColumn(orgId, datasetId, columnName, columnSchema, axiosCallConfig(options)),
    options,
  );
};

type DatasetSchemaRequest = {
  orgId: string;
  datasetId: string;
  bypassCache?: boolean;
};

export const getDatasetSchema = async (
  req: DatasetSchemaRequest,
  options?: CallOptions,
): Promise<IndexedEntitySchema | null> => getSchemaForResource(req.orgId, req.datasetId, options);

// Use the following if the retrieve is being used as the basis for an edit or immediately following an edit
export const getUncachedDatasetSchema = async (
  req: DatasetSchemaRequest,
  options?: CallOptions,
): Promise<IndexedEntitySchema | null> => getSchema(req.orgId, req.datasetId, false, options);

export const getSchemaForResource = async (
  orgId: string,
  resourceId: string,
  options?: CallOptions,
): Promise<IndexedEntitySchema | null> => getSchema(orgId, resourceId, true, options);

const getSchema = async (
  orgId: string,
  resourceId: string,
  useCached: boolean,
  options?: CallOptions,
): Promise<IndexedEntitySchema | null> => {
  const client = options?.context?.songbirdClient ?? songbirdClient;
  options = addToContext({ datasetId: resourceId }, options);
  const enableCache = await useCachedEntitySchema(orgId, options);
  const schema: SongbirdEntitySchema | null = await tryExecute(
    () => client.models.getCachedEntitySchema(orgId, resourceId, useCached && enableCache, axiosCallConfig(options)),
    true,
    false,
    undefined,
    options?.context,
  );
  if (!schema) return null;
  return getEnrichedSchema(orgId, resourceId, schema);
};

const getEnrichedSchema = (orgId: string, datasetId: string, schema: SongbirdEntitySchema): IndexedEntitySchema => {
  const columns = Object.entries(schema.columns).map(([key, c]) => {
    return {
      dataType: c.dataType,
      discreteness: c.discreteness === 'continuous' ? DiscretenessType.Continuous : DiscretenessType.Discrete,
      classifier: c.classifier ?? 'input',
      column: key,
      tags: c.tags ?? [],
    };
  });
  // There should always be a builtinMetric, we just have backwards API compatibility issues
  const metrics = Object.values(schema.metrics ?? {}).map((m) => ({ ...m, defaultMetric: m.builtinMetric ?? 'count' }));
  return {
    orgId,
    datasetId,
    entitySchema: { columns, metrics },
  };
};

const compareAbsValues = (a: number, b: number) => {
  const absA = Math.abs(a);
  const absB = Math.abs(b);
  if (absA > absB) return 1;
  if (absB > absA) return -1;
  return 0;
};

const compareWeightEntries = (a: [string, number], b: [string, number]) => {
  return compareAbsValues(a[1], b[1]);
};

export type FeatureWeightRequestKey = {
  orgId: string;
  datasetId: string;
  tags?: SegmentTag[];
};

export type FeatureWeightRequestParams = {
  feature: string;
};

// map of feature name to its weight
export type FeatureWeightsMap = Map<string, FeatureWeight>;

type DatasetWeightMetadata = {
  timestamp: number;
};

export type FeatureWeights = {
  weights: FeatureWeightsMap;
  metadata: DatasetWeightMetadata;
};

export type FeatureWeightsRequest = FeatureWeightRequestKey;

export type BatchableFeatureWeightRequest = BatchableRequest<FeatureWeightRequestKey, FeatureWeightRequestParams>;

export const getFeatureWeights = async (
  params: FeatureWeightsRequest,
  options?: CallOptions,
): Promise<FeatureWeights | null> => {
  const { orgId, datasetId } = params;
  const client = options?.context?.songbirdClient ?? songbirdClient;
  options = addToContext({ datasetId }, options);
  const entityWeights = await tryExecute(
    () => client.weights.getColumnWeights(orgId, datasetId, axiosCallConfig(options)),
    true,
    false,
    undefined,
    options?.context,
  );
  if (!entityWeights) return null;
  const weightMap = new Map<string, FeatureWeight>();
  entityWeights.segmentWeights?.forEach((segmentWeight: SegmentWeight) => {
    // only support overall segment weights currently
    if (!segmentWeight.segment?.tags?.length) {
      const rankedWeights = Object.entries(segmentWeight.weights ?? {})
        .sort(compareWeightEntries)
        .reverse();
      rankedWeights.forEach(([key, value], index) => weightMap.set(key, { rank: index + 1, value }));
    }
  });

  return { weights: weightMap, metadata: { timestamp: entityWeights.metadata?.updatedTimestamp ?? 0 } };
};

export const filterFeatureWeights = (
  params: FeatureWeightRequestParams,
  results: FeatureWeights[] | null,
): FeatureWeights | null => {
  const result = results ? results[0] : null;
  if (!result) return null;
  const { feature } = params;
  const weight = result.weights.get(feature);
  if (weight === undefined) return null;
  return { weights: new Map([[feature, weight]]), metadata: result.metadata };
};

export const getBatchableFeatureWeights = async (
  key: FeatureWeightRequestKey,
  params: FeatureWeightRequestParams[], // we make the same call regardless of this - the filter handles the features
  options?: CallOptions,
): Promise<FeatureWeights[]> => {
  const { orgId, datasetId, tags } = key;
  options = addToContext({ datasetId }, options);
  const weights = await getFeatureWeights({ orgId, datasetId, tags }, options);
  return weights ? [weights] : [];
};

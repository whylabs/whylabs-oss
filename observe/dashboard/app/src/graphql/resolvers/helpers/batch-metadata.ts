import { GraphQLResolveInfo } from 'graphql';
import { parse } from 'graphql-parse-resolve-info';

import { getLogger } from '../../../providers/logger';
import { GetActiveColumnsRequest } from '../../../services/data/data-service/api-wrappers/columns';
import { Maybe } from '../../../services/data/data-service/data-service-types';
import {
  getTimestampsForSingleBucket,
  timePeriodToMillis,
} from '../../../services/data/data-service/data-service-utils';
import { ColumnSchema } from '../../../services/data/datasources/helpers/entity-schema';
import { callOptionsFromGraphqlCxt } from '../../../util/async-helpers';
import { describeTags, pageArray } from '../../../util/misc';
import { validatePaginationLimit } from '../../../util/validation';
import { FullGraphQLContext } from '../../context';
import { filterColumnSchemas } from '../../filters/column-filters';
import {
  BatchMetadata,
  Dataset,
  DateRange,
  FeatureSketch,
  FeatureSketchFilter,
  FilteredFeatureSketches,
  ModelMetrics,
  SegmentTag,
  TimePeriod,
} from '../../generated/graphql';
import { getBaselineForDataset } from './dataset';
import { getNonEmptyColumns } from './filtered-columns';

const logger = getLogger('GraphQLResolvers-Main');

/**
 * Given the context of a given GraphQL operation and if it refers to the BatchMetadata type,
 * determine whether to include the specified fields.
 * @param info Resolver info
 * @param fields Which fields to check for
 */
const shouldFetchBatchMetadataFields = (info: GraphQLResolveInfo, fields: (keyof BatchMetadata)[]): boolean => {
  const resolved = parse(info);
  if (!resolved) return false;

  // we're looking specifically for BatchMetadata fields within the queries
  const batchMetadataTypeName: BatchMetadata['__typename'] = 'BatchMetadata';
  // if either of these is specified, we do need to fetch input/output counts
  const fieldNames: Set<keyof BatchMetadata> = new Set(fields);

  const requestedBatchMetadataFields = resolved.fieldsByTypeName[batchMetadataTypeName];
  if (!requestedBatchMetadataFields) return false; // no fields queried on BatchMetadata

  // checks requested fields against the set of fields
  return Object.keys(requestedBatchMetadataFields).some((fieldName) =>
    fieldNames.has(fieldName as keyof BatchMetadata),
  );
};

/**
 * Given the context of a given GraphQL operation and if it refers to the BatchMetadata type,
 * determine whether to include the input/output counts.
 * @param info Resolver info
 */
export const shouldFetchInputOutputCounts = (info: GraphQLResolveInfo): boolean => {
  return shouldFetchBatchMetadataFields(info, ['inputCount', 'outputCount']);
};

export const shouldFetchMetrics = (info: GraphQLResolveInfo): boolean => {
  return shouldFetchBatchMetadataFields(info, ['metrics']);
};

export const getBatchModelMetricsByTimestamp = async (
  parent: BatchMetadata,
  context: FullGraphQLContext,
): Promise<ModelMetrics> => {
  const { dataSources, resolveUserOrgID } = context;
  const req = {
    orgId: resolveUserOrgID(),
    datasetId: parent.datasetId,
    segmentTags: parent.tags,
    timestamp: parent.timestamp,
    granularity: parent.batchFrequency,
  };
  return dataSources.dataService.getModelMetricsForTimestamp(req);
};

export const getBatchMetadataByTimestamp = async (
  parent: Dataset,
  context: FullGraphQLContext,
  datasetTimestamp: number,
  info: GraphQLResolveInfo,
): Promise<BatchMetadata | null> => {
  const { datasetId } = parent;
  const { resolveUserOrgID, dataSources } = context;
  const orgId = resolveUserOrgID();

  // In ES we can query pre-aggregated dataset profiles with the timestamp matching the query
  // In Druid we must aggregate the daily batch, starting from the requested timestamp
  const { fromTime, toTime } = getTimestampsForSingleBucket(parent.batchFrequency, datasetTimestamp);

  const includeInputOutputCounts = shouldFetchInputOutputCounts(info);
  const { outputs } = includeInputOutputCounts ? await getBaselineForDataset(parent, context) : { outputs: [] };

  const req = {
    orgId,
    datasetId,
    segmentTags: parent.tags,
    includeInputOutputCounts,
    outputFeatureNames: outputs.map((o) => o.name),
    fromTime,
    toTime,
    timePeriod: parent.batchFrequency,
  };

  const batches = await (parent.tags?.length > 0
    ? dataSources.dataService.getSegmentedMetadataForTimeRange({
        key: { orgId, datasetId, includeInputOutputCounts, fromTime, toTime, timePeriod: req.timePeriod },
        params: { segmentTags: req.segmentTags, outputFeatureNames: req.outputFeatureNames },
      })
    : dataSources.dataService.getBatchMetadataForTimeRange(req));

  if (batches.length > 1 && parent.batchFrequency !== TimePeriod.P1M)
    // Overfetching of monthly buckets is expected for any month with less than 31 days
    logger.error(
      'Found more than one batch created near the timestamp %s for org %s, dataset %s, tags %s',
      datasetTimestamp,
      orgId,
      datasetId,
      describeTags(parent.tags),
    );

  const batch = batches.shift() ?? null;
  if (batch && shouldFetchMetrics(info)) {
    batch.metrics = await getBatchModelMetricsByTimestamp(batch, context);
  }
  return batch;
};

export const getBatchDateRange = async (
  parent: Dataset,
  context: FullGraphQLContext,
  timestamp: number,
): Promise<DateRange | null> => {
  const { datasetId } = parent;
  const { resolveUserOrgID, dataSources } = context;
  const orgId = resolveUserOrgID();

  // Make sure we get some of the following batch so we get its timestamp
  const approxBatchMillis = timePeriodToMillis(parent.batchFrequency);
  const overFetchToTime = timestamp + approxBatchMillis + 1;
  const req = {
    orgId,
    datasetId,
    fromTime: timestamp,
    toTime: overFetchToTime,
    timePeriod: parent.batchFrequency,
  };
  return dataSources.dataService.getBatchDateRange(req);
};

type ReferenceBatchIdentifier = {
  type: 'reference';
  datasetId: string;
  tags: SegmentTag[];
  referenceProfileId: string;
};

type DatasetBatchIdentifier = {
  type: 'dataset';
  datasetId: string;
  tags: SegmentTag[];
  batchFrequency: TimePeriod;
  batchTimestamp: number;
};

type IndividualProfileIdentifier = {
  type: 'individual';
  datasetId: string;
  tags: SegmentTag[];
  retrievalToken: string;
};

type BatchIdentifier = ReferenceBatchIdentifier | DatasetBatchIdentifier | IndividualProfileIdentifier;

const getFeatureSketchesForBatch = async (
  context: FullGraphQLContext,
  identifier: BatchIdentifier,
  histogramSplitPoints: Maybe<number[]>,
  filter: Maybe<FeatureSketchFilter>,
): Promise<FeatureSketch[]> => {
  const { dataSources, resolveUserOrgID } = context;
  const orgId = resolveUserOrgID();
  const options = callOptionsFromGraphqlCxt(context);
  // unfortunately typescript doesn't seem to recognize ts-pattern's `.with` statements
  // as automatic union typeguards here :(((
  // return match(type).with('dataset', () => ...this is a dataset identifier, dammit!)
  const { datasetId } = identifier;
  const commonReq = {
    orgId,
    datasetId,
    histogramSplitPoints: histogramSplitPoints ?? null,
    filter: filter ?? null,
  };
  switch (identifier.type) {
    case 'dataset': {
      const { batchFrequency, batchTimestamp, tags } = identifier;
      const req = {
        ...commonReq,
        segmentTags: tags,
        datasetTimestamp: batchTimestamp,
        timePeriod: batchFrequency,
      };
      return dataSources.dataService.getProfilesByTimestamp(req, options);
    }
    case 'reference': {
      const { referenceProfileId, tags } = identifier;
      const request = {
        key: {
          ...commonReq,
          segmentTags: tags,
        },
        params: { referenceProfileId },
      };

      return dataSources.dataService.getReferenceSketches(request, options);
    }
    case 'individual': {
      const { retrievalToken, tags } = identifier;
      const req = {
        ...commonReq,
        segmentTags: tags,
        retrievalToken,
      };
      return dataSources.dataService.getIndividualSketch(req, options);
    }
    default:
      throw Error(`Unknown identifier type ${JSON.stringify(identifier)}`);
  }
};

type FilteredSketchesForBatchRequest = {
  batchIdentifier: BatchIdentifier;
  context: FullGraphQLContext;
  limit: number;
  offset: number;
  filter?: Maybe<FeatureSketchFilter>;
  histogramSplitPoints?: Maybe<number[]>;
  excludeEmpty?: Maybe<boolean>;
};

const EMPTY_SKETCHES: FilteredFeatureSketches = {
  totalCount: 0,
  totalDiscrete: 0,
  totalNonDiscrete: 0,
  results: [],
};

export const getFilteredSketchesForBatch = async (
  req: FilteredSketchesForBatchRequest,
): Promise<FilteredFeatureSketches> => {
  const { batchIdentifier, context, limit, offset, filter, histogramSplitPoints, excludeEmpty } = req;
  const { resolveUserOrgID, dataSources } = context;
  validatePaginationLimit(limit);
  const orgId = resolveUserOrgID();

  // Get and filter the features/columns
  const schema = await dataSources.schema.getDatasetSchema({
    orgId,
    datasetId: batchIdentifier.datasetId,
  });
  if (!schema) {
    return EMPTY_SKETCHES;
  }
  const neededFilter: FeatureSketchFilter | null | undefined = filter;
  let columns: ColumnSchema[] = neededFilter
    ? filterColumnSchemas(schema?.entitySchema.columns, neededFilter)
    : schema?.entitySchema.columns;
  if (excludeEmpty && batchIdentifier.type !== 'individual') {
    const orgId = context.resolveUserOrgID();
    let params: GetActiveColumnsRequest;
    if (batchIdentifier.type === 'dataset') {
      const { datasetId, batchFrequency, batchTimestamp, tags } = batchIdentifier;
      params = { datasetId, fromTimestamp: batchTimestamp, granularity: batchFrequency, orgId, segmentTags: tags };
    } else {
      // reference profile
      const { datasetId, referenceProfileId, tags } = batchIdentifier;
      params = {
        datasetId,
        referenceProfileId,
        orgId,
        segmentTags: tags,
      };
    }
    const nonEmpty = await getNonEmptyColumns(params, context);
    columns = columns.filter((c) => nonEmpty.includes(c.column));
  }
  const sortedColumns = columns.sort((l, r) => l.column.toLowerCase().localeCompare(r.column.toLowerCase()));

  const totalCount = sortedColumns.length; // How many columns after filtering but before pagination
  const totalDiscrete = sortedColumns.reduce((count, s) => (s.discreteness === 'discrete' ? ++count : count), 0);
  const totalNonDiscrete = totalCount - totalDiscrete; // this assumes discrete and non-discrete are the only 2, mutually exclusive feature types

  // apply offset/limit
  const paginatedColumns = pageArray(sortedColumns, offset, limit);

  // construct a new filter thats just based on feature names (which is supported in the queries)
  const columnNamesFilter: FeatureSketchFilter = {
    featureNames: paginatedColumns.map((schema) => schema.column),
  };

  const filteredSketches: FeatureSketch[] = await getFeatureSketchesForBatch(
    context,
    batchIdentifier,
    histogramSplitPoints,
    columnNamesFilter,
  );

  return {
    totalCount,
    totalDiscrete,
    totalNonDiscrete,
    results: filteredSketches,
  };
};

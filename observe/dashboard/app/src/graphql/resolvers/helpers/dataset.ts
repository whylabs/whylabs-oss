import { getLogger } from '../../../providers/logger';
import { DataAvailabilityRequest } from '../../../services/data/data-service/api-wrappers/time-boundary';
import { callOptionsFromGraphqlCxt } from '../../../util/async-helpers';
import { FullGraphQLContext } from '../../context';
import { entitySchemaToBaseline, entitySchemaToGql } from '../../contract-converters/songbird/entity-schema-converters';
import { Dataset, EntitySchema } from '../../generated/graphql';

export type DatasetBaseline = Pick<Dataset, 'features' | 'outputs' | 'dataAvailability' | 'datasetId'>;
const logger = getLogger('GraphQLResolvers-Main');

/**
 * Fetches the entity schema for a dataset.
 *
 * @param dataset Parent dataset
 * @param context GraphQL context
 */
export const getSchemaForDataset = async (dataset: Dataset, context: FullGraphQLContext): Promise<EntitySchema> => {
  const { resolveUserOrgID, dataSources } = context;
  const orgId = resolveUserOrgID();
  const { datasetId } = dataset;
  try {
    const schema = await dataSources.schema.getDatasetSchema({ orgId, datasetId }, callOptionsFromGraphqlCxt(context));
    if (schema) {
      return entitySchemaToGql(schema);
    }

    // create an empty baseline if we can't find schema information
    return {
      inputs: [],
      outputs: [],
      hasColumns: false,
      hasInputs: false,
      hasOutputs: false,
      inputCounts: { total: 0, discrete: 0, nonDiscrete: 0 },
      outputCounts: { total: 0, discrete: 0, nonDiscrete: 0 },
    };
  } catch (err) {
    logger.error(
      err,
      'Failed to load schema or data availability information for org %s, dataset %s.',
      orgId,
      datasetId,
    );
    throw err;
  }
};

/**
 * Fetches the baseline for a dataset.
 * Datasets have some required properties in GQL schema (such as features, outputs, etc) that are not
 * populated when the field is first resolved, because it requires querying Druid (a potentially expensive
 * and pointless operation).
 *
 * This function should be used to fetch information about the dataset that is not available via metadata API.
 *
 * @param dataset Parent dataset
 * @param context GraphQL context
 */
export const getBaselineForDataset = async (
  dataset: Dataset,
  context: FullGraphQLContext,
): Promise<DatasetBaseline> => {
  const { resolveUserOrgID, dataSources } = context;
  const orgId = resolveUserOrgID();
  const { datasetId } = dataset;
  const req: DataAvailabilityRequest = {
    key: { orgId, tags: [], timePeriod: dataset.batchFrequency },
    params: { datasetId },
  };
  const options = callOptionsFromGraphqlCxt(context);

  try {
    // TODO: fetch data availability timestamps from the schema store instead of Druid/Postgres, once they're available
    const [dataAvailability, schema] = await Promise.all([
      dataSources.dataService.getDataAvailability(req),
      dataSources.schema.getDatasetSchema({ orgId, datasetId }, options),
    ]);

    if (schema) {
      return entitySchemaToBaseline(dataset, schema, dataAvailability);
    }

    // create an empty baseline if we can't find schema information
    return {
      datasetId: dataset.datasetId,
      features: [],
      outputs: [],
      dataAvailability,
    };
  } catch (err) {
    logger.error(
      err,
      'Failed to load schema or data availability information for org %s, dataset %s.',
      orgId,
      datasetId,
    );
    throw err;
  }
};

import { getCustomMetrics } from '../../../services/data/datasources/helpers/entity-schema';
import { callOptionsFromGraphqlCxt } from '../../../util/async-helpers';
import { FullGraphQLContext } from '../../context';
import { MetricSchema, ModelType } from '../../generated/graphql';

export const getCustomMetricsByTag = async (
  resourceType: ModelType,
  datasetId: string,
  context: FullGraphQLContext,
  metricTags?: string[],
): Promise<MetricSchema[]> => {
  const orgId = context.resolveUserOrgID();
  const schema = await context.dataSources.schema.getDatasetSchema(
    { orgId, datasetId },
    callOptionsFromGraphqlCxt(context),
  );
  if (!schema) {
    return [];
  }
  const metadata = await context.dataSources.dataService.getDefaultMetricMetadata(
    {},
    callOptionsFromGraphqlCxt(context),
  );
  return getCustomMetrics(
    schema,
    orgId,
    datasetId,
    resourceType,
    {
      tags: metricTags ?? [],
    },
    metadata,
  );
};

import { v4 as uuid } from 'uuid';

import { getLogger } from '../../../providers/logger';
import { IndexedEntitySchema } from '../../../services/data/datasources/helpers/entity-schema';
import { OperationContext, sortAsc } from '../../../util/misc';
import {
  DataAvailability,
  Dataset,
  EntityColumnSchema,
  EntitySchema,
  Feature,
  FeatureSketch,
  FeatureType,
} from '../../generated/graphql';
import { DatasetBaseline } from '../../resolvers/helpers/dataset';

const logger = getLogger('EntitySchemaConverter');

export const columnDataTypeMap = new Map<string, FeatureType>([
  ['unknown', FeatureType.Unknown],
  ['integral', FeatureType.Integer],
  ['fractional', FeatureType.Fraction],
  ['string', FeatureType.Text],
  ['bool', FeatureType.Boolean],
  ['boolean', FeatureType.Boolean],
  ['null', FeatureType.Null],
]);

const columnDataTypeToGQL = (dataType: string | null, context: OperationContext): FeatureType => {
  const featureType = dataType ? columnDataTypeMap.get(dataType) : undefined;
  if (!featureType) {
    logger.error('Found unknown column data type %s. Context %o', dataType, context);
    return FeatureType.Unknown;
  }

  return featureType;
};

/**
 * Converts the dataset/entity schema to the dataset baseline.
 * The concept of baselines predates schema store by a good amount of time and the conversion is therefore a bit awkward.
 * @param dataset Parent dataset that we're generating the baseline for
 * @param schema Schema for this dataset
 * @param dataAvailability Date range for the available data
 */
export const entitySchemaToBaseline = (
  dataset: Dataset,
  schema: IndexedEntitySchema,
  dataAvailability: DataAvailability,
): DatasetBaseline => {
  const { name: datasetName, datasetId, batchFrequency: timePeriod, tags } = dataset;
  const { orgId } = schema;

  const inputs: Feature[] = [];
  const outputs: Feature[] = [];

  schema.entitySchema.columns
    // TODO: do not sort columns in Dashbird, can be super expensive. Requires making changes in Elastic to make the columns a nested, sortable object
    // https://app.clickup.com/t/3d2hb0q
    .sort((a, b) => sortAsc(a.column, b.column))
    .forEach((schema) => {
      const isDiscrete = schema.discreteness === 'discrete';

      const inferredType = columnDataTypeToGQL(schema.dataType, {
        dataType: 'baseline',
        orgId,
        datasetId,
        featureName: schema.column,
      });

      // Deprecated, but populated for backwards compatibility
      // Entity schema can only provide a small subset of FeatureSketch fields. Need to update the UI to not rely on this field anymore
      // https://app.clickup.com/t/3ddyd83
      const baselineSketch: Partial<FeatureSketch> = {
        id: uuid(),
        showAsDiscrete: isDiscrete,
        schemaSummary: {
          inference: {
            type: inferredType,
            count: 1,
            ratio: 1,
          },
          typeCounts: [],
        },
      };
      const feature: Feature = {
        id: uuid(),
        modelName: datasetName,
        modelId: datasetId,
        modelTimePeriod: timePeriod,
        tags,
        name: schema.column,
        baselineSketch: baselineSketch as FeatureSketch, // unsafe but necessary cast for backwards compat
        schema: {
          inferredType,
          isDiscrete,
          tags: schema.tags,
        },
        sketches: [],
        alerts: [],
        events: [],
      };
      switch (schema.classifier) {
        case 'input':
          inputs.push(feature);
          break;
        case 'output':
          outputs.push(feature);
          break;
        default:
          logger.error(
            'Found unknown feature classifier %s. Skipping feature. Org %s, dataset %s, feature %s',
            schema.classifier,
            orgId,
            datasetId,
            schema.column,
          );
      }
    });

  return {
    datasetId,
    features: inputs,
    outputs,
    dataAvailability,
  };
};

export const entitySchemaToGql = (schema: IndexedEntitySchema): EntitySchema => {
  const inputs: EntityColumnSchema[] = [];
  const outputs: EntityColumnSchema[] = [];
  const { orgId, datasetId } = schema;
  schema.entitySchema.columns
    .sort((a, b) => sortAsc(a.column, b.column))
    .forEach((col) => {
      const isDiscrete = col.discreteness === 'discrete';

      const inferredType = columnDataTypeToGQL(col.dataType, {
        dataType: 'baseline',
        orgId,
        datasetId,
        featureName: col.column,
      });

      const colSchema: EntityColumnSchema = {
        name: col.column,
        isDiscrete,
        inferredType,
        tags: col.tags,
      };

      switch (col.classifier) {
        case 'input':
          inputs.push(colSchema);
          break;
        case 'output':
          outputs.push(colSchema);
          break;
        default:
          logger.error(
            'Found unknown feature classifier %s. Skipping feature. Org %s, dataset %s, feature %s',
            col.classifier,
            orgId,
            datasetId,
            col.column,
          );
      }
    });
  const discreteInputCount = inputs.filter((i) => i.isDiscrete).length;
  const discreteOutputCount = outputs.filter((i) => i.isDiscrete).length;
  return {
    inputs,
    outputs,
    columns: inputs.concat(outputs),
    hasColumns: inputs.length > 0 || outputs.length > 0,
    hasInputs: inputs.length > 0,
    hasOutputs: outputs.length > 0,
    inputCounts: {
      total: inputs.length,
      discrete: discreteInputCount,
      nonDiscrete: inputs.length - discreteInputCount,
    },
    outputCounts: {
      total: outputs.length,
      discrete: discreteOutputCount,
      nonDiscrete: outputs.length - discreteOutputCount,
    },
  };
};

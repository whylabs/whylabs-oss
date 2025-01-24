import { FeatureWeight, SegmentTag } from '../../../graphql/generated/graphql';
import {
  filterFeatureWeights,
  getBatchableFeatureWeights,
  getDatasetSchema,
  getFeatureWeights,
} from '../songbird/api-wrappers/entity-schema';
import { WhyLabsDataSource } from './whylabs-data-source';

// map of feature name to its weight
export type FeatureWeightsMap = Map<string, FeatureWeight>;

type DatasetWeightMetadata = {
  timestamp: number;
};

export type FeatureWeights = {
  weights: FeatureWeightsMap;
  metadata: DatasetWeightMetadata;
};

/**
 * Exposes access to the WhyLabs entity schema API.
 */
export class EntitySchemaSource extends WhyLabsDataSource {
  private batchFeatureWeights = this.createDataLoader(getBatchableFeatureWeights, filterFeatureWeights);

  public getBatchFeatureWeights = async (req: {
    params: { feature: string };
    key: { datasetId: string; orgId: string; tags: Array<SegmentTag> };
  }): Promise<FeatureWeights | null> => {
    return this.batchFeatureWeights.load(req);
  };

  public getFeatureWeights = this.get(getFeatureWeights);
  public getDatasetSchema = this.get(getDatasetSchema);
}

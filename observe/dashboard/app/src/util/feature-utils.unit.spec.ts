import { expect } from 'chai';

import {
  AlertCategory,
  Feature,
  FeatureSortBy,
  FeatureWeight,
  SortDirection,
  TimePeriod,
} from '../graphql/generated/graphql';
import { sortFeatures } from './feature-utils';

const createMockFeature = (name: string, weight: FeatureWeight): Feature => ({
  id: '',
  name,
  weight,
  alerts: [],
  events: [],
  modelId: '',
  modelName: '',
  modelTimePeriod: TimePeriod.P1D,
  sketches: [],
  tags: [],
});

const getMockFeatures = (): Feature[] => [
  createMockFeature('feature1', {
    value: 100,
    rank: 1,
  }),
  createMockFeature('feature2', { value: 10, rank: 2 }),
];

const getMockFeaturesWithInterestingWeights = (): Feature[] => [
  createMockFeature('highPositive', {
    value: 100,
    rank: 1,
  }),
  createMockFeature('midPositive', {
    value: 50,
    rank: 4,
  }),
  createMockFeature('empty', {}),
  createMockFeature('midNegative', {
    value: -45,
    rank: 3,
  }),
  createMockFeature('highNegative', {
    value: -95,
    rank: 2,
  }),
];

// sanity check to ensure sorting features doesn't accidentally filter them
const expectedFeatureCount = getMockFeatures().length;

describe('Test feature utils', function () {
  describe('Test sortFeatures', function () {
    it('should sort features by weight ascending', function () {
      const features: Feature[] = getMockFeatures();
      sortFeatures(features, { by: FeatureSortBy.Weight, direction: SortDirection.Asc }, {}, undefined);

      expect(features.length).to.equal(expectedFeatureCount);
      expect(features[0].name).to.equal('feature2');
      expect(features[1].name).to.equal('feature1');
    });

    it('should sort features by weight descending', function () {
      const features: Feature[] = getMockFeatures();
      sortFeatures(features, { by: FeatureSortBy.Weight, direction: SortDirection.Desc }, {}, undefined);

      expect(features.length).to.equal(expectedFeatureCount);
      expect(features[0].name).to.equal('feature1');
      expect(features[1].name).to.equal('feature2');
    });

    it('should sort features by rank ascending', function () {
      const features: Feature[] = getMockFeatures();
      sortFeatures(features, { by: FeatureSortBy.WeightRank, direction: SortDirection.Asc }, {}, undefined);

      expect(features.length).to.equal(expectedFeatureCount);
      expect(features[0].name).to.equal('feature1');
      expect(features[1].name).to.equal('feature2');
    });

    it('should sort features by rank descending', function () {
      const features: Feature[] = getMockFeatures();
      sortFeatures(features, { by: FeatureSortBy.WeightRank, direction: SortDirection.Desc }, {}, undefined);

      expect(features.length).to.equal(expectedFeatureCount);
      expect(features[0].name).to.equal('feature2');
      expect(features[1].name).to.equal('feature1');
    });

    it('should treat missing weight rank as unimportant', function () {
      const features: Feature[] = getMockFeatures();
      const featureToModify = features.find((f) => f.name === 'feature1');
      delete featureToModify?.weight?.rank;

      sortFeatures(features, { by: FeatureSortBy.WeightRank, direction: SortDirection.Asc }, {}, undefined);

      expect(features.length).to.equal(expectedFeatureCount);
      expect(features[0].name).to.equal('feature2');
      expect(features[1].name).to.equal('feature1');
    });

    it('should sort descending by absolute value of weight and treat missing weight as unimportant', function () {
      const features: Feature[] = getMockFeaturesWithInterestingWeights();
      const startingLength = features.length;

      sortFeatures(features, { by: FeatureSortBy.AbsoluteWeight, direction: SortDirection.Desc }, {}, undefined);

      expect(features.length).to.equal(startingLength);
      expect(features[0].name).to.equal('highPositive');
      expect(features[1].name).to.equal('highNegative');
      expect(features[2].name).to.equal('midPositive');
      expect(features[3].name).to.equal('midNegative');
      expect(features[4].name).to.equal('empty');
    });

    it('should sort ascending by absolute value of weight and treat missing weight as unimportant', function () {
      const features: Feature[] = getMockFeaturesWithInterestingWeights();
      const startingLength = features.length;

      sortFeatures(features, { by: FeatureSortBy.AbsoluteWeight, direction: SortDirection.Asc }, {}, undefined);

      expect(features.length).to.equal(startingLength);
      expect(features[0].name).to.equal('midNegative');
      expect(features[1].name).to.equal('midPositive');
      expect(features[2].name).to.equal('highNegative');
      expect(features[3].name).to.equal('highPositive');
      expect(features[4].name).to.equal('empty');
    });

    it('should sort features by name ascending', function () {
      const features: Feature[] = getMockFeatures();
      sortFeatures(features, { by: FeatureSortBy.Name, direction: SortDirection.Asc }, {}, undefined);

      expect(features.length).to.equal(expectedFeatureCount);
      expect(features[0].name).to.equal('feature1');
      expect(features[1].name).to.equal('feature2');
    });

    it('should sort features by name descending', function () {
      const features: Feature[] = getMockFeatures();
      sortFeatures(features, { by: FeatureSortBy.Name, direction: SortDirection.Desc }, {}, undefined);

      expect(features.length).to.equal(expectedFeatureCount);
      expect(features[0].name).to.equal('feature2');
      expect(features[1].name).to.equal('feature1');
    });

    it('should sort features by alert count ascending', function () {
      const features: Feature[] = getMockFeatures();
      sortFeatures(
        features,
        {
          by: FeatureSortBy.AlertCount,
          direction: SortDirection.Asc,
        },
        { feature2: new Map([[AlertCategory.DataQuality, 10]]) },
        undefined,
      );

      expect(features.length).to.equal(expectedFeatureCount);
      expect(features[0].name).to.equal('feature1');
      expect(features[1].name).to.equal('feature2');
    });

    it('should sort features by alert count descending', function () {
      const features: Feature[] = getMockFeatures();
      sortFeatures(
        features,
        {
          by: FeatureSortBy.AlertCount,
          direction: SortDirection.Desc,
        },
        { feature2: new Map([[AlertCategory.DataQuality, 10]]) },
        undefined,
      );

      expect(features.length).to.equal(expectedFeatureCount);
      expect(features[0].name).to.equal('feature2');
      expect(features[1].name).to.equal('feature1');
    });
  });
});

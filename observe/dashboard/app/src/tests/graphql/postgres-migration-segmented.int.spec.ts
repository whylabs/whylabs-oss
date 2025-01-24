/* eslint-disable max-lines */
import { promises as fs } from 'fs';

import { get } from 'lodash';

import {
  ACTUAL_DIR,
  checkAgainstExpected,
  checkCase,
  checkNoError,
  checkNullsInAnalysisResults,
  checkSketchApproxSame,
  getExpected,
  saveActual,
} from '../helpers/checks';
import {
  Sketch,
  filterAnalyzerResults,
  filterFeature,
  filterFeatures,
  filterFilteredFeature,
  filterOverview,
  filterRollupResults,
  filterSegmentFeature,
  filterSegmentedFilteredFeature,
  filterSegments,
} from '../helpers/filtersort';
import {
  POSTGRES_END_TS,
  POSTGRES_MIGRATION_TEST_ORG,
  POSTGRES_MIGRATION_TEST_USER,
  POSTGRES_START_TS,
  QueryCheckerWithResult,
  TestServer,
  setupApolloServer,
  setupTestUser,
} from '../integration-common';
import {
  AnalysisMetric,
  GetAllSegmentsDocument,
  GetAnalysisResultsDocument,
  GetAvailableFilteredFeaturesDiscreteDocument,
  GetAvailableFilteredSegmentedFeaturesDiscreteDocument,
  GetFrequentItemsForSegmentedFeatureDocument,
  GetIoFeaturesDocument,
  GetMetricData2Document,
  GetMetricDataRollupDocument,
  GetModelOverviewInformationDocument,
  GetPaginatedAnalysisResultsDocument,
  GetQuantileSummariesForFeatureDocument,
  GetQuantileSummariesForSegmentedFeatureDocument,
  GetSegmentMetricDataRollup2Document,
  GetSegmentPerformanceDocument,
  GetSegmentedFeatureBasicDataDocument,
  GetTotalCountDocument,
  GetUniqueSummariesForFeatureDocument,
  GetUniquenessEventsForSegmentedFeatureMv3Document,
  SegmentFeaturesTableDocument,
  SegmentsListingTable2Document,
  SegmentsListingTableDocument,
  SortDirection,
} from './generated/graphql';

/**
 * See postgres-migration.int.spec.ts
 *
 */

describe('Migration test segmented queries vs expected results', function () {
  let checkQuery: QueryCheckerWithResult = () => {
    throw Error('Query engine not started yet, cannot execute query.');
  };
  let testServer: TestServer | null = null;
  before(async function () {
    const testIdentity = await setupTestUser(POSTGRES_MIGRATION_TEST_USER, POSTGRES_MIGRATION_TEST_ORG);
    await fs.stat(ACTUAL_DIR).catch(async (err) => {
      if (err.code === 'ENOENT') {
        await fs.mkdir(ACTUAL_DIR);
      }
    });
    testServer = await setupApolloServer();
    checkQuery = async (query, variables, assertions?, identity = testIdentity) => {
      if (testServer) {
        return testServer.checkQueryResult(query, variables, assertions, identity);
      }
      throw Error('Test server is not setup so cannot check results');
    };
  });

  describe('tests for model-4 (Segmented model)', function () {
    // Model 4 is a segmented daily model with 4 segments (2 keys with 2 values).
    // In the basic notebook (first week of data):
    // Feature float from the notebook is the same 3.33 in all segments.
    // Feature str = a | b | c | d by default; but is initially just 'a' in key1=3&key2=one and b | c in key1=4&key2=two.
    // I then uploaded two further weeks. In the second week, float is 4.44, the first segment str switches to
    // value 'd' and all others have the 4 values. In the third week, all segments  have the same values.

    // Inputs page
    it('should match expected for GetAvailableFilteredFeaturesDiscrete', async function () {
      await checkQuery(
        GetAvailableFilteredFeaturesDiscreteDocument,
        {
          model: 'model-4',
          from: POSTGRES_START_TS,
          to: POSTGRES_END_TS,
          offset: 0,
          limit: 30,
          filter: {
            substring: '',
          },
        },
        async (res) => checkCase(res, 'GetAvailableFilteredFeaturesDiscrete_model4', filterFilteredFeature),
      );
    });

    // Inputs page
    it('should match expected for GetTotalCount', async function () {
      await checkQuery(
        GetTotalCountDocument,
        {
          modelId: 'model-4',
          featureId: 'str',
          from: POSTGRES_START_TS,
          to: POSTGRES_END_TS,
        },
        async (res) => checkCase(res, 'GetTotalCount_model4'),
      );
    });

    // Inputs page
    it('should match expected for GetUniqueSummariesForFeature', async function () {
      await checkQuery(
        GetUniqueSummariesForFeatureDocument,
        {
          model: 'model-4',
          feature: 'str',
          from: POSTGRES_START_TS,
          to: POSTGRES_END_TS,
        },
        async (res) => checkCase(res, 'GetUniqueSummariesForFeature_model4', filterFeature),
      );
    });

    // Segments page
    it('should match expected for GetSegmentsListingTable', async function () {
      await checkQuery(
        SegmentsListingTableDocument,
        {
          model: 'model-4',
          from: POSTGRES_START_TS,
          to: POSTGRES_END_TS,
          offset: 0,
          limit: 30,
          substring: '',
        },
        (res) => checkCase(res, 'SegmentsListingTable_model4', filterSegments),
      );
    });

    // Segments input page
    it('should match expected for SegmentFeaturesTable', async function () {
      await checkQuery(
        SegmentFeaturesTableDocument,
        {
          datasetId: 'model-4',
          tags: [
            {
              key: 'key1',
              value: '3',
            },
            {
              key: 'key2',
              value: 'one',
            },
          ],
          text: '',
          alertTypes: [],
          anomalyCategories: [],
          includeDiscrete: true,
          includeNonDiscrete: true,
          from: POSTGRES_START_TS,
          to: POSTGRES_END_TS,
          limit: 30,
          offset: 0,
        },
        async (res) => {
          await checkCase(res, 'SegmentFeaturesTable_model4', filterSegmentedFilteredFeature);
        },
      );
    });

    // Segments input page
    it('should match expected for GetAllSegments', async function () {
      await checkQuery(
        GetAllSegmentsDocument,
        {
          dataset: 'model-4',
        },
        async (res) => {
          await checkCase(res, 'GetAllSegments_model4');
        },
      );
    });

    // Segments input feature page (str)
    it('should match expected for GetAvailableFilteredSegmentedFeaturesDiscrete', async function () {
      await checkQuery(
        GetAvailableFilteredSegmentedFeaturesDiscreteDocument,
        {
          model: 'model-4',
          tags: [
            {
              key: 'key1',
              value: '4',
            },
            {
              key: 'key2',
              value: 'two',
            },
          ],
          from: POSTGRES_START_TS,
          to: POSTGRES_END_TS,
          offset: 0,
          limit: 30,
          filter: {
            substring: '',
          },
        },
        async (res) =>
          checkCase(res, 'GetAvailableFilteredSegmentedFeaturesDiscrete_model4', filterSegmentedFilteredFeature),
      );
    });

    it('should match expected for GetSegmentedFeatureBasicData', async function () {
      await checkQuery(
        GetSegmentedFeatureBasicDataDocument,
        {
          model: 'model-4',
          feature: 'str',
          tags: [
            {
              key: 'key1',
              value: '3',
            },
            {
              key: 'key2',
              value: 'one',
            },
          ],
          from: POSTGRES_START_TS,
          to: POSTGRES_END_TS,
        },
        async (res) => checkCase(res, 'GetSegmentedFeatureBasicData_model4', filterSegmentFeature),
      );
    });

    it('should match expected for GetAnalysisResults', async function () {
      await checkQuery(
        GetAnalysisResultsDocument,
        {
          anomaliesOnly: false,
          datasetId: 'model-4',
          from: POSTGRES_START_TS,
          to: POSTGRES_END_TS,
          analyzerTypes: ['drift'],
          columns: ['str'],
          tags: [
            {
              key: 'key1',
              value: '3',
            },
            {
              key: 'key2',
              value: 'one',
            },
          ],
        },
        async (res) => {
          await checkCase(res, 'GetAnalysisResults_model4', filterAnalyzerResults);
          checkNullsInAnalysisResults(res.data?.analysisResults ?? []);
        },
      );
    });

    it('should match expected for GetFrequentItemsForSegmentedFeature', async function () {
      await checkQuery(
        GetFrequentItemsForSegmentedFeatureDocument,
        {
          model: 'model-4',
          feature: 'str',
          tags: [
            {
              key: 'key1',
              value: '3',
            },
            {
              key: 'key2',
              value: 'one',
            },
          ],
          from: POSTGRES_START_TS,
          to: POSTGRES_END_TS,
        },
        async (res) => checkCase(res, 'GetFrequentItemsForSegmentedFeature_model4', filterSegmentFeature),
      );
    });

    it('should match expected for GetUniquenessEventsForSegmentedFeatureMv3', async function () {
      await checkQuery(
        GetUniquenessEventsForSegmentedFeatureMv3Document,
        {
          model: 'model-4',
          feature: 'str',
          tags: [
            {
              key: 'key1',
              value: '3',
            },
            {
              key: 'key2',
              value: 'one',
            },
          ],
          from: POSTGRES_START_TS,
          to: POSTGRES_END_TS,
        },
        async (res) => checkCase(res, 'GetUniquenessEventsForSegmentedFeatureMv3_model4', filterSegmentFeature),
      );
    });
  });

  describe('tests for model-8 (Segmented classification model)', function () {
    it('should match expected for GetSegmentPerformance', async function () {
      await checkQuery(
        GetSegmentPerformanceDocument,
        {
          datasetId: 'model-8',
          tags: [
            {
              key: 'gender',
              value: 'female',
            },
            {
              key: 'loc',
              value: 'south',
            },
          ],
          from: POSTGRES_START_TS,
          to: POSTGRES_END_TS,
        },
        async (res) => checkCase(res, 'GetSegmentPerformance_model8'),
      );
    });
  });

  describe('tests for model-9 (Multiclass with three tags)', function () {
    // Model 9 is a segmented daily model with 12 segments. Performance metrics change every two days.
    // The keys are age = old | young, gender = male | female, loc = north | south | east | west. There are no
    // young males. It is based on a whylabs_test script and not on the notebook.
    // These segments have slightly different hasjob value counts:
    // male-north-old
    // female-north-old
    // These segments have different performance metrics:
    // female-north-old
    // female-east-young
    // There is one monitor for a merged segment (female-north) on accuracy (see anomalies in anomaly feed).
    // anomalies feed

    // Anomaly feed
    it('should match expected for GetPaginatedAnalysisResults', async function () {
      await checkQuery(
        GetPaginatedAnalysisResultsDocument,
        {
          anomaliesOnly: true,
          datasetId: 'model-9',
          from: POSTGRES_START_TS,
          to: POSTGRES_END_TS,
          limit: 30,
          offset: 0,
          sortDirection: SortDirection.Desc,
        },
        async (res) => {
          await checkCase(res, 'GetPaginatedAnalysisResults_model9', filterAnalyzerResults);
          checkNullsInAnalysisResults(res.data?.paginatedAnalysisResults ?? []);
        },
      );
    });

    // Tracing page
    it('should match expected for GetSegmentMetricDataRollup', async function () {
      await checkQuery(
        GetSegmentMetricDataRollup2Document,
        {
          from: POSTGRES_START_TS,
          to: POSTGRES_END_TS,
          segmentKey: 'age',
          queries: [
            {
              datasetId: 'model-9',
              metric: AnalysisMetric.ClassificationAccuracy,
            },
          ],
        },
        async (res) => checkCase(res, 'GetSegmentMetricDataRollup_model9', filterRollupResults),
      );
    });

    // Tracing page
    it('should match expected for GetMetricDataRollup', async function () {
      await checkQuery(
        GetMetricDataRollupDocument,
        {
          from: POSTGRES_START_TS,
          to: POSTGRES_END_TS,
          queries: [
            {
              datasetId: 'model-9',
              metric: AnalysisMetric.ClassificationAccuracy,
            },
            {
              datasetId: 'model-9',
              metric: AnalysisMetric.PredictionCount,
            },
          ],
        },
        async (res) => checkCase(res, 'GetMetricDataRollup_model9'),
      );
    });

    // Tracing page
    it('should match expected for GetIOFeatures', async function () {
      await checkQuery(
        GetIoFeaturesDocument,
        {
          modelId: 'model-15',
        },
        async (res) => checkCase(res, 'GetIOFeatures_model15', filterFeatures),
      );
    });

    // custom perf metrics
    it('should match expected for GetMetricData2', async function () {
      await checkQuery(
        GetMetricData2Document,
        {
          from: POSTGRES_START_TS,
          to: POSTGRES_END_TS,
          segment: [
            {
              key: 'category',
              value: 'Bakery, Cakes and Dairy',
            },
          ],
          queries: [
            {
              datasetId: 'model-16',
              metric: AnalysisMetric.Mean,
              feature: 'market_price',
            },
          ],
        },
        async (res) => checkCase(res, 'GetMetricData2_model16'),
      );
    });
  });

  describe('tests for model-16 (Segmented retail model)', function () {
    // Inputs page
    it('should match expected for GetQuantileSummariesForFeature', async function () {
      const actual = await checkQuery(
        GetQuantileSummariesForFeatureDocument,
        {
          model: 'model-16',
          feature: 'market_price',
          from: POSTGRES_START_TS,
          to: POSTGRES_END_TS,
        },
        checkNoError,
      );
      await saveActual('GetQuantileSummariesForFeature_model16', actual);
      const expected = await getExpected('GetQuantileSummariesForFeature_model16');
      await checkAgainstExpected(actual, expected, filterFeature);
      const expectedSketches: Sketch[] = get(expected, ['data', 'model', 'feature', 'sketches']);
      const actualSketches = get(actual, ['data', 'model', 'feature', 'sketches']);
      expectedSketches.forEach((expectedSketch, index) => {
        const actualSketch = actualSketches[index] as Sketch;
        checkSketchApproxSame(actualSketch, expectedSketch);
      });
    });

    it('should match expected for GetQuantileSummariesForSegmentedFeature', async function () {
      const actual = await checkQuery(
        GetQuantileSummariesForSegmentedFeatureDocument,
        {
          model: 'model-16',
          feature: 'market_price',
          from: POSTGRES_START_TS,
          to: POSTGRES_END_TS,
          tags: [
            {
              key: 'category',
              value: 'Baby Care',
            },
          ],
        },
        checkNoError,
      );
      await saveActual('GetQuantileSummariesForSegmentedFeature_model16', actual);
      const expected = await getExpected('GetQuantileSummariesForSegmentedFeature_model16');
      await checkAgainstExpected(actual, expected, filterSegmentFeature);
      const expectedSketches: Sketch[] = get(expected, ['data', 'model', 'segment', 'feature', 'sketches']);
      const actualSketches = get(actual, ['data', 'model', 'segment', 'feature', 'sketches']);
      expectedSketches.forEach((expectedSketch, index) => {
        const actualSketch = actualSketches[index] as Sketch;
        checkSketchApproxSame(actualSketch, expectedSketch);
      });
    });
  });

  describe('tests for model-8 (Segmented regression model)', function () {
    it('should match expected for SegmentsListingTable2', async function () {
      await checkQuery(
        SegmentsListingTable2Document,
        {
          model: 'model-8',
          from: POSTGRES_START_TS,
          to: POSTGRES_END_TS,
          offset: 0,
          limit: 100,
          tags: [
            {
              key: 'gender',
              value: 'male',
            },
          ],
        },
        async (res) => checkCase(res, 'SegmentsListingTable2_model8', filterSegments),
      );
    });

    it('should match expected for GetSegmentPerformance', async function () {
      await checkQuery(
        GetSegmentPerformanceDocument,
        {
          datasetId: 'model-8',
          tags: [
            {
              key: 'gender',
              value: 'female',
            },
            {
              key: 'loc',
              value: 'south',
            },
          ],
          from: POSTGRES_START_TS,
          to: POSTGRES_END_TS,
        },
        async (res) => checkCase(res, 'GetSegmentPerformance_model8'),
      );
    });
  });

  describe('project dashboard', function () {
    it('should match expected for GetModelOverviewInformation', async function () {
      const filter = (data: object) => filterOverview(['model-11'], data);
      await checkQuery(
        GetModelOverviewInformationDocument,
        {
          from: POSTGRES_START_TS,
          to: POSTGRES_END_TS,
        },
        async (res) => checkCase(res, 'GetModelOverviewInformation', filter),
      );
    });
  });

  after(async function () {
    if (testServer) {
      await testServer.serverCleanup();
      testServer = null;
    }
  });
});

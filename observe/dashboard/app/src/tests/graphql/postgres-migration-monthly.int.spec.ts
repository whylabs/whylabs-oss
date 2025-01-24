/* eslint-disable max-lines */
import { promises as fs } from 'fs';

import { ACTUAL_DIR, checkCase, checkNullsInAnalysisResults } from '../helpers/checks';
import {
  filterAnalyzerResults,
  filterFeature,
  filterFeatures,
  filterFilteredFeature,
  filterRollupResults,
  filterSegmentFeature,
  filterSegmentedFilteredFeature,
  filterSegments,
} from '../helpers/filtersort';
import {
  POSTGRES_END_TS,
  POSTGRES_MIGRATION_TEST_ORG,
  POSTGRES_MIGRATION_TEST_USER,
  QueryCheckerWithResult,
  TestServer,
  setupApolloServer,
  setupTestUser,
} from '../integration-common';
import {
  AnalysisMetric,
  GetAllSegmentsDocument,
  GetAvailableFilteredFeaturesDiscreteDocument,
  GetAvailableFilteredSegmentedFeaturesDiscreteDocument,
  GetFrequentItemsForSegmentedFeatureDocument,
  GetIoFeaturesDocument,
  GetMetricDataRollupDocument,
  GetPaginatedAnalysisResultsDocument,
  GetQuantileSummariesForFeatureDocument,
  GetQuantileSummariesForSegmentedFeatureDocument,
  GetSegmentMetricDataRollup2Document,
  GetSegmentPerformanceDocument,
  GetSegmentedFeatureBasicDataDocument,
  GetTotalCountDocument,
  GetUniqueSummariesForFeatureDocument,
  SegmentFeaturesTableDocument,
  SegmentsListingTableDocument,
  SortDirection,
} from './generated/graphql';

/**
 * See postgres-migration.int.spec.ts
 *
 */

const MONTHLY_MODEL_START_TS = 1704067200000; // 2024-01-01

describe('Migration test monthly queries vs expected results', function () {
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

  // Temporarily disable as data ingest went wrong
  describe('tests for model-15 (Monthly segmented classification)', function () {
    // Created using script in whylabs_test
    // https://gitlab.com/whylabs/datascience/notebooks/-/blob/mainline/whylabs_test/test_scripts/postgres-migration/monthly_segmented_multiclass.py

    // Input feature page
    it('should match expected for GetAvailableFilteredFeaturesDiscrete', async function () {
      await checkQuery(
        GetAvailableFilteredFeaturesDiscreteDocument,
        {
          model: 'model-15',
          from: MONTHLY_MODEL_START_TS,
          to: POSTGRES_END_TS,
          offset: 0,
          limit: 30,
          filter: {
            substring: '',
          },
        },
        async (res) => checkCase(res, 'GetAvailableFilteredFeaturesDiscrete_model15', filterFilteredFeature),
      );
    });

    // Inputs feature page
    it('should match expected for GetQuantileSummariesForFeature', async function () {
      await checkQuery(
        GetQuantileSummariesForFeatureDocument,
        {
          model: 'model-15',
          feature: 'age',
          from: MONTHLY_MODEL_START_TS,
          to: POSTGRES_END_TS,
        },
        async (res) => checkCase(res, 'GetQuantileSummariesForFeature_model15', filterFeature),
      );
    });

    // Inputs feature page
    it('should match expected for GetTotalCount', async function () {
      await checkQuery(
        GetTotalCountDocument,
        {
          modelId: 'model-15',
          featureId: 'age',
          from: MONTHLY_MODEL_START_TS,
          to: POSTGRES_END_TS,
        },
        async (res) => checkCase(res, 'GetTotalCount_model15'),
      );
    });

    // Inputs feature page
    it('should match expected for GetUniqueSummariesForFeature', async function () {
      await checkQuery(
        GetUniqueSummariesForFeatureDocument,
        {
          model: 'model-15',
          feature: 'age',
          from: MONTHLY_MODEL_START_TS,
          to: POSTGRES_END_TS,
        },
        async (res) => checkCase(res, 'GetUniqueSummariesForFeature_model15', filterFeature),
      );
    });

    // Segments page
    it('should match expected for GetSegmentsListingTable', async function () {
      await checkQuery(
        SegmentsListingTableDocument,
        {
          model: 'model-15',
          from: MONTHLY_MODEL_START_TS,
          to: POSTGRES_END_TS,
          offset: 0,
          limit: 30,
          substring: '',
        },
        (res) => checkCase(res, 'SegmentsListingTable_model15', filterSegments),
      );
    });

    // Segments input page
    it('should match expected for SegmentFeaturesTable', async function () {
      await checkQuery(
        SegmentFeaturesTableDocument,
        {
          datasetId: 'model-15',
          tags: [
            {
              key: 'age',
              value: 'old',
            },
            {
              key: 'gender',
              value: 'female',
            },
            {
              key: 'loc',
              value: 'east',
            },
          ],
          text: '',
          alertTypes: [],
          anomalyCategories: [],
          includeDiscrete: true,
          includeNonDiscrete: true,
          from: MONTHLY_MODEL_START_TS,
          to: POSTGRES_END_TS,
          limit: 30,
          offset: 0,
        },
        async (res) => {
          await checkCase(res, 'SegmentFeaturesTable_model15', filterSegmentedFilteredFeature);
        },
      );
    });

    // Segments input page
    it('should match expected for GetAllSegments', async function () {
      await checkQuery(
        GetAllSegmentsDocument,
        {
          dataset: 'model-15',
        },
        async (res) => checkCase(res, 'GetAllSegments_model15'),
      );
    });

    // Segments input feature page
    it('should match expected for GetAvailableFilteredSegmentedFeaturesDiscrete', async function () {
      await checkQuery(
        GetAvailableFilteredSegmentedFeaturesDiscreteDocument,
        {
          model: 'model-15',
          tags: [
            {
              key: 'age',
              value: 'old',
            },
            {
              key: 'gender',
              value: 'female',
            },
            {
              key: 'loc',
              value: 'east',
            },
          ],
          from: MONTHLY_MODEL_START_TS,
          to: POSTGRES_END_TS,
          offset: 0,
          limit: 30,
          filter: {
            substring: '',
          },
        },
        async (res) =>
          checkCase(res, 'GetAvailableFilteredSegmentedFeaturesDiscrete_model15', filterSegmentedFilteredFeature),
      );
    });

    it('should match expected for GetSegmentedFeatureBasicData', async function () {
      await checkQuery(
        GetSegmentedFeatureBasicDataDocument,
        {
          model: 'model-15',
          feature: 'age',
          tags: [
            {
              key: 'age',
              value: 'old',
            },
            {
              key: 'gender',
              value: 'female',
            },
            {
              key: 'loc',
              value: 'east',
            },
          ],
          from: MONTHLY_MODEL_START_TS,
          to: POSTGRES_END_TS,
        },
        async (res) => checkCase(res, 'GetSegmentedFeatureBasicData_model15', filterSegmentFeature),
      );
    });

    it('should match expected for GetFrequentItemsForSegmentedFeature', async function () {
      await checkQuery(
        GetFrequentItemsForSegmentedFeatureDocument,
        {
          model: 'model-15',
          feature: 'age',
          tags: [
            {
              key: 'age',
              value: 'old',
            },
            {
              key: 'gender',
              value: 'female',
            },
            {
              key: 'loc',
              value: 'east',
            },
          ],
          from: MONTHLY_MODEL_START_TS,
          to: POSTGRES_END_TS,
        },
        async (res) => checkCase(res, 'GetFrequentItemsForSegmentedFeature_model15', filterSegmentFeature),
      );
    });

    it('should match expected for GetQuantileSummariesForSegmentedFeature', async function () {
      await checkQuery(
        GetQuantileSummariesForSegmentedFeatureDocument,
        {
          model: 'model-15',
          feature: 'age',
          tags: [
            {
              key: 'age',
              value: 'old',
            },
            {
              key: 'gender',
              value: 'female',
            },
            {
              key: 'loc',
              value: 'east',
            },
          ],
          from: MONTHLY_MODEL_START_TS,
          to: POSTGRES_END_TS,
        },
        async (res) => checkCase(res, 'GetQuantileSummariesForSegmentedFeature_model15', filterSegmentFeature),
      );
    });

    it('should match expected for GetSegmentPerformance', async function () {
      await checkQuery(
        GetSegmentPerformanceDocument,
        {
          datasetId: 'model-15',
          tags: [
            {
              key: 'age',
              value: 'old',
            },
            {
              key: 'gender',
              value: 'female',
            },
            {
              key: 'loc',
              value: 'east',
            },
          ],
          from: MONTHLY_MODEL_START_TS,
          to: POSTGRES_END_TS,
        },
        async (res) => checkCase(res, 'GetSegmentPerformance_model15'),
      );
    });

    // Anomaly feed
    it('should match expected for GetPaginatedAnalysisResults with no offset', async function () {
      // Because we can't guarantee list order other than by timestamp, all tests need to retrieve a complete
      // timestamp's worth of data to compare, and then sort stably in the filtersort
      await checkQuery(
        GetPaginatedAnalysisResultsDocument,
        {
          anomaliesOnly: true,
          datasetId: 'model-15',
          from: MONTHLY_MODEL_START_TS,
          to: POSTGRES_END_TS,
          limit: 12,
          offset: 0,
          sortDirection: SortDirection.Desc,
        },
        async (res) => {
          await checkCase(res, 'GetPaginatedAnalysisResults_model15a', filterAnalyzerResults);
          checkNullsInAnalysisResults(res.data?.paginatedAnalysisResults ?? []);
        },
      );
    });

    it('should match expected for GetPaginatedAnalysisResults with an offset', async function () {
      // Because we can't guarantee list order other than by timestamp, all tests need to retrieve a complete
      // timestamp's worth of data to compare, and then sort stably in the filtersort
      await checkQuery(
        GetPaginatedAnalysisResultsDocument,
        {
          anomaliesOnly: true,
          datasetId: 'model-15',
          from: MONTHLY_MODEL_START_TS,
          to: POSTGRES_END_TS,
          limit: 12,
          offset: 12,
          sortDirection: SortDirection.Desc,
        },
        async (res) => {
          await checkCase(res, 'GetPaginatedAnalysisResults_model15b', filterAnalyzerResults);
          checkNullsInAnalysisResults(res.data?.paginatedAnalysisResults ?? []);
        },
      );
    });

    // Tracing page
    it('should match expected for GetSegmentMetricDataRollup', async function () {
      await checkQuery(
        GetSegmentMetricDataRollup2Document,
        {
          from: MONTHLY_MODEL_START_TS,
          to: POSTGRES_END_TS,
          segmentKey: 'loc',
          queries: [
            {
              datasetId: 'model-15',
              metric: AnalysisMetric.PredictionCount,
            },
          ],
        },
        async (res) => checkCase(res, 'GetSegmentMetricDataRollup_model15', filterRollupResults),
      );
    });

    // Tracing page
    it('should match expected for GetMetricDataRollup', async function () {
      await checkQuery(
        GetMetricDataRollupDocument,
        {
          from: MONTHLY_MODEL_START_TS,
          to: POSTGRES_END_TS,
          queries: [
            {
              datasetId: 'model-15',
              metric: AnalysisMetric.ClassificationAccuracy,
            },
            {
              datasetId: 'model-15',
              metric: AnalysisMetric.PredictionCount,
            },
          ],
        },
        async (res) => checkCase(res, 'GetMetricDataRollup_model15'),
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
  });

  after(async function () {
    if (testServer) {
      await testServer.serverCleanup();
      testServer = null;
    }
  });
});

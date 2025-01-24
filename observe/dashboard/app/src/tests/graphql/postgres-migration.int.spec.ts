/* eslint-disable max-lines */
import { promises as fs } from 'fs';

import { MILLIS_PER_DAY } from '../../constants';
import {
  ACTUAL_DIR,
  checkAgainstExpected,
  checkCase,
  checkHistogramApproxSame,
  checkNoError,
  checkNullsInAnalysisResults,
  getExpected,
  saveActual,
} from '../helpers/checks';
import {
  filterAnalyzerResults,
  filterAnalyzerRuns,
  filterBatches,
  filterFeature,
  filterFeatures,
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
  GetAnalysisResultsDocument,
  GetAnalyzerRunCountDocument,
  GetAnalyzerRunsDocument,
  GetAnomalyCount2Document,
  GetDataExistenceInformationDocument,
  GetFeatureUnifiedBinsDocument,
  GetFrequentItemsForFeatureDocument,
  GetInferredDataAnalysisDocument,
  GetIoFeaturesDocument,
  GetLatestTimestampDocument,
  GetMetricDataRollupDocument,
  GetMissingAnalysisDocument,
  GetMissingValuesForFeatureDocument,
  GetModelDatasetMetricsAndLatestTimestampDocument,
  GetModelPerformanceDocument,
  GetModelProfilesDocument,
  GetModelSelectedProfilesDocument,
  GetMultiFeatureDriftAnalysisDocument,
  GetPaginatedAnalysisResultsDocument,
  GetUniquenessEventsForFeatureMv3Document,
  SortDirection,
  TimePeriod,
} from './generated/graphql';

/**
 * About the data:
 * The datasets were mainly created using the getting started and various datasets notebooks in the colab notebooks here:
 * https://drive.google.com/drive/folders/1fTSnHxYFOnEfc8qQ2Y6k1o8YMY_T1F71
 * The monitor configs were created manually and are saved in the whylabs test project.
 * https://gitlab.com/whylabs/datascience/notebooks/-/tree/mainline/whylabs_test/test_scripts/postgres-migration
 *
 * To add more cases:
 * - Capture query/vars and results from "Christine Test Postgres" org in dev, using the graphql plugin in Chrome browser.
 *   - If you are running the same query from the same page of the UI on a different model, you should be able to reuse the
 *     existing query.
 * - Put the query in the `postgres-migration-queries` folder.
 * - Put the results in `actual` folder.
 * - Run `yarn generate` to add the query document to the generated graphql.ts
 * - Add a case below, with the captured vars as params, and add the document to the imports list.
 *
 * Possible manual adjustments:
 * - If you get `Not all operations have an unique name` when running generate, modify the query name and doc, and try again.
 * - You may need to replace some strings with enums in queries.
 * - You may need to filter out some fields in the results that are generated using a filtersort function passed to checkCase.
 * - If you get an error about a fragment occurring twice, you may need to manually replace the fragment references.
 *
 */

describe('Migration test queries vs expected results', function () {
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

  describe('tests for model-12 (Regression model)', function () {
    // Model 12 is a regression daily model with changes every 2 days.

    // Performance page
    // error rate changes from 15% to 30% to 0%
    it('should match expected for GetModelPerformance', async function () {
      await checkQuery(
        GetModelPerformanceDocument,
        {
          datasetId: 'model-12',
          from: POSTGRES_START_TS,
          to: POSTGRES_END_TS,
        },
        async (res) => checkCase(res, 'GetModelPerformance_model12'),
      );
    });

    // Performance page with RMSE, MAE and MSE errors.
    // Checks the diff pct analyzer type
    it('should match expected for GetAnalysisResults', async function () {
      await checkQuery(
        GetAnalysisResultsDocument,
        {
          anomaliesOnly: false,
          datasetId: 'model-12',
          from: POSTGRES_START_TS,
          to: POSTGRES_END_TS,
          metrics: [
            AnalysisMetric.ClassificationAccuracy,
            AnalysisMetric.ClassificationAuroc,
            AnalysisMetric.ClassificationFpr,
            AnalysisMetric.ClassificationPrecision,
            AnalysisMetric.ClassificationRecall,
            AnalysisMetric.RegressionMae,
            AnalysisMetric.RegressionMse,
            AnalysisMetric.RegressionRmse,
          ],
          tags: [],
        },
        async (res) => {
          await checkCase(res, 'GetAnalysisResults_model12', filterAnalyzerResults);
          checkNullsInAnalysisResults(res.data?.analysisResults ?? []);
        },
      );
    });

    // Profiles page
    it('should match expected for GetModelSelectedProfiles', async function () {
      const actual = await checkQuery(
        GetModelSelectedProfilesDocument,
        {
          modelId: 'model-12',
          timestamps: [POSTGRES_START_TS],
          staticProfileIds: [],
          limit: 30,
          offset: 0,
          filter: {},
        },
        checkNoError,
      );
      await saveActual('GetModelSelectedProfiles_model12', actual);
      const expected = await getExpected('GetModelSelectedProfiles_model12');
      await checkAgainstExpected(actual, expected, filterBatches);
      await checkHistogramApproxSame(actual, expected);
    });

    // Profiles page
    it('should match expected for GetFeatureUnifiedBins', async function () {
      const actual = await checkQuery(
        GetFeatureUnifiedBinsDocument,
        {
          modelId: 'model-12',
          splitpoints: [
            1033.3333333333333, 1066.6666666666667, 1100, 1133.3333333333333, 1166.6666666666667, 1200,
            1233.3333333333333, 1266.6666666666667, 1300, 1333.3333333333335, 1366.6666666666667, 1400,
            1433.3333333333335, 1466.6666666666667, 1500, 1533.3333333333335, 1566.6666666666667, 1600,
            1633.3333333333335, 1666.6666666666667, 1700, 1733.3333333333335, 1766.6666666666667, 1800,
            1833.3333333333335, 1866.6666666666667, 1900, 1933.3333333333335, 1966.6666666666667,
          ],
          featureId: 'output_target',
          timestamps: [POSTGRES_START_TS],
          staticProfileIds: [],
        },
        checkNoError,
      );
      await saveActual('GetFeatureUnifiedBins_model12', actual);
      const expected = await getExpected('GetFeatureUnifiedBins_model12');
      await checkAgainstExpected(actual, expected, filterBatches);
      await checkHistogramApproxSame(actual, expected);
    });

    // Profiles page
    it('should match expected for GetDataExistenceInformation', async function () {
      await checkQuery(
        GetDataExistenceInformationDocument,
        {
          datasetId: 'model-12',
        },
        async (res) =>
          // Note: request is not identical to what is currently used in UI - it has extra hasData field
          checkCase(res, 'GetDataExistenceInformation_model12'),
      );
    });

    // Profiles page
    it('should match expected for GetLatestTimestamp', async function () {
      await checkQuery(
        GetLatestTimestampDocument,
        {
          modelId: 'model-12',
        },
        async (res) => checkCase(res, 'GetLatestTimestamp_model12'),
      );
    });

    //  Profiles page
    it('should match expected for GetModelProfiles', async function () {
      await checkQuery(
        GetModelProfilesDocument,
        {
          modelId: 'model-12',
          from: POSTGRES_START_TS,
          to: POSTGRES_END_TS,
        },
        (res) => checkCase(res, 'GetModelProfiles_model12'),
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
              datasetId: 'model-12',
              metric: AnalysisMetric.RegressionRmse,
            },
            {
              datasetId: 'model-12',
              metric: AnalysisMetric.PredictionCount,
            },
          ],
        },
        async (res) => checkCase(res, 'GetMetricDataRollup_model12'),
      );
    });

    it('should match expected for GetIOFeatures', async function () {
      await checkQuery(
        GetIoFeaturesDocument,
        {
          modelId: 'model-12',
        },
        async (res) => checkCase(res, 'GetIOFeatures_model12', filterFeatures),
      );
    });

    // summary page
    it('should match expected for GetModelDatasetMetricsAndLatestTimestamp', async function () {
      await checkQuery(
        GetModelDatasetMetricsAndLatestTimestampDocument,
        {
          datasetId: 'model-12',
          dailyFrom: POSTGRES_END_TS - MILLIS_PER_DAY,
          dailyTo: POSTGRES_END_TS,
          weeklyFrom: POSTGRES_END_TS - 7 * MILLIS_PER_DAY,
          weeklyTo: POSTGRES_END_TS,
          granularity: TimePeriod.All,
        },
        async (res) => checkCase(res, 'GetModelDatasetMetricsAndLatestTimestamp_model12'),
      );
    });
  });

  describe('tests for model-13 (Classification model)', function () {
    // Model 13 is a binary classification daily model with changes every 2 days.

    // Performance page
    // Accuracy changes from 0.875 to 0.625 to 1.0.
    // Precision changes from 1.0 to 0.67 to 1.0.
    // Recall changes from 0.75 to 0.5 to 1.0.
    it('should match expected for GetModelPerformance', async function () {
      await checkQuery(
        GetModelPerformanceDocument,
        {
          datasetId: 'model-13',
          from: POSTGRES_START_TS,
          to: POSTGRES_END_TS,
        },
        async (res) => checkCase(res, 'GetModelPerformance_model13'),
      );
    });

    // Performance page with f1, accuracy and precision anomalies.
    it('should match expected for GetAnalysisResults', async function () {
      await checkQuery(
        GetAnalysisResultsDocument,
        {
          anomaliesOnly: false,
          datasetId: 'model-13',
          from: POSTGRES_START_TS,
          to: POSTGRES_END_TS,
          metrics: [
            AnalysisMetric.ClassificationAccuracy,
            AnalysisMetric.ClassificationAuroc,
            AnalysisMetric.ClassificationFpr,
            AnalysisMetric.ClassificationPrecision,
            AnalysisMetric.ClassificationRecall,
            AnalysisMetric.RegressionMae,
            AnalysisMetric.RegressionMse,
            AnalysisMetric.RegressionRmse,
          ],
          tags: [],
        },
        async (res) => {
          await checkCase(res, 'GetAnalysisResults_model13', filterAnalyzerResults);
          checkNullsInAnalysisResults(res.data?.analysisResults ?? []);
        },
      );
    });
  });

  describe('tests for model-11 (Different data types)', function () {
    // Model 11 is a daily model with different types of inputs. It has:
    // * various flavors of missing value, including all nan, none
    // * unknown (date fields)
    // * int, float, str
    // * constant value
    // * columns that change between two values (frequent item drift anomalies)
    // * columns where each row is different (histogram drift anomalies)
    // * columns which change to have twice the number of missing or unique values (unique ratio and missing ratio anomalies)
    // * columns that change type (inferred data type anomalies)
    // It has a reference profile called 'first-batch' which is used in brave-springgreen-rat-9882 monitor for
    // frequent items drift.
    // It has integration health monitors for late upload, missing datapoint.

    // Anomaly feed
    it('should match expected for GetPaginatedAnalysisResults', async function () {
      // Because we can't guarantee list order other than by timestamp, all tests need to retrieve a complete
      // timestamp's worth of data to compare, and then sort stably in the filtersort
      await checkQuery(
        GetPaginatedAnalysisResultsDocument,
        {
          anomaliesOnly: true,
          datasetId: 'model-11',
          from: POSTGRES_START_TS,
          to: POSTGRES_END_TS,
          limit: 9, // specially chosen to be all anonmalies on 10/20 and 10/19
          offset: 0,
          sortDirection: SortDirection.Desc,
        },
        async (res) => {
          await checkCase(res, 'GetPaginatedAnalysisResults_model11a', filterAnalyzerResults);
          checkNullsInAnalysisResults(res.data?.paginatedAnalysisResults ?? []);
        },
      );
    });

    // Anomaly feed
    it('should match expected for GetPaginatedAnalysisResults integration health', async function () {
      await checkQuery(
        GetPaginatedAnalysisResultsDocument,
        {
          anomaliesOnly: true,
          datasetId: 'model-11',
          from: POSTGRES_END_TS,
          to: POSTGRES_END_TS + MILLIS_PER_DAY * 5, // four days after last data on 21 Oct (expect anomalies after 2 full days)
          limit: 30,
          offset: 0,
          sortDirection: SortDirection.Desc,
          metrics: [AnalysisMetric.SecondsSinceLastUpload],
        },
        async (res) => {
          await checkCase(res, 'GetPaginatedAnalysisResults_model11b', filterAnalyzerResults);
          checkNullsInAnalysisResults(res.data?.paginatedAnalysisResults ?? []);
        },
      );
    });

    // Anomaly feed (hand modified query)
    // Because we can't guarantee list order other than by timestamp, all tests need to retrieve a complete
    // timestamp's worth of data to compare, and then sort stably in the filtersort
    it('should match expected for GetPaginatedAnalysisResults with an offset', async function () {
      await checkQuery(
        GetPaginatedAnalysisResultsDocument,
        {
          anomaliesOnly: true,
          datasetId: 'model-11',
          from: POSTGRES_START_TS,
          to: POSTGRES_END_TS,
          limit: 8,
          offset: 9, // start from 10/18
          sortDirection: SortDirection.Desc,
        },
        async (res) => {
          await checkCase(res, 'GetPaginatedAnalysisResults_model11c', filterAnalyzerResults);
          checkNullsInAnalysisResults(res.data?.paginatedAnalysisResults ?? []);
        },
      );
    });

    it('should match expected for GetAnomalyCount2', async function () {
      await checkQuery(
        GetAnomalyCount2Document,
        {
          datasetId: 'model-11',
          from: POSTGRES_START_TS,
          to: POSTGRES_END_TS,
        },
        async (res) => {
          await checkCase(res, 'GetAnomalyCount2_model11');
        },
      );
    });

    // Profiles page (to test ref profiles)
    it('should match expected for GetModelProfiles', async function () {
      await checkQuery(
        GetModelProfilesDocument,
        {
          modelId: 'model-11',
          from: POSTGRES_START_TS,
          to: POSTGRES_END_TS,
        },
        async (res) => {
          await checkCase(res, 'GetModelProfiles_model11');
        },
      );
    });

    // Profiles page (to test ref profiles)
    it('should match expected for GetModelSelectedProfiles', async function () {
      const actual = await checkQuery(
        GetModelSelectedProfilesDocument,
        {
          modelId: 'model-11',
          timestamps: [],
          staticProfileIds: ['ref-gUZOGdkM99L36Cmi'],
          limit: 30,
          offset: 0,
          // need to exclude alldiffint, alldiffstr fields as they doent have stable frequent items
          filter: {
            featureNames: [
              'alldiffdate',
              'alldifffloat',
              'date',
              'float',
              'int',
              'int-doublingnull',
              'int-doublingunique',
              'nan',
              'string',
              'strthenint',
            ],
          },
        },
        checkNoError,
      );
      await saveActual('GetModelSelectedProfiles_model11', actual);
      const expected = await getExpected('GetModelSelectedProfiles_model11');
      await checkAgainstExpected(actual, expected, filterBatches);
      await checkHistogramApproxSame(actual, expected, 0.2);
    });

    // Input feature page for strthenint - checks the comparison analyzer type
    it('should match expected for InferredDataAnalysis', async function () {
      await checkQuery(
        GetInferredDataAnalysisDocument,
        {
          datasetId: 'model-11',
          featureId: 'strthenint',
          anomaliesOnly: false,
          from: POSTGRES_START_TS,
          to: POSTGRES_END_TS,
          tags: [],
        },
        async (res) => checkCase(res, 'GetInferredDataAnalysis_model11', filterAnalyzerResults),
      );
    });

    // Input feature page for strthenint
    it('should match expected for GetFrequentItemsForFeature', async function () {
      await checkQuery(
        GetFrequentItemsForFeatureDocument,
        {
          model: 'model-11',
          feature: 'strthenint',
          from: POSTGRES_START_TS,
          to: POSTGRES_END_TS,
        },
        async (res) => checkCase(res, 'GetFrequentItemsForFeature_model11', filterFeature),
      );
    });

    // Input feature page for int-doublingnull
    it('should match expected for GetMissingValuesForFeature', async function () {
      await checkQuery(
        GetMissingValuesForFeatureDocument,
        {
          model: 'model-11',
          feature: 'int-doublingnull',
          from: POSTGRES_START_TS,
          to: POSTGRES_END_TS,
        },
        async (res) => checkCase(res, 'GetMissingValuesForFeature_model11', filterFeature),
      );
    });

    // Input feature page for int-doublingnull - checks the stddev analyzer type
    it('should match expected for GetMissingAnalysis', async function () {
      await checkQuery(
        GetMissingAnalysisDocument,
        {
          datasetId: 'model-11',
          featureId: 'int-doublingnull',
          anomaliesOnly: false,
          from: POSTGRES_START_TS,
          to: POSTGRES_END_TS,
          tags: [],
        },
        (res) => checkCase(res, 'GetMissingAnalysis_model11', filterAnalyzerResults),
      );
    });

    // Input feature page for int-doublingunique
    it('should match expected for GetUniquenessEventsForFeatureMv3', async function () {
      await checkQuery(
        GetUniquenessEventsForFeatureMv3Document,
        {
          model: 'model-11',
          feature: 'int-doublingnull',
          from: POSTGRES_START_TS,
          to: POSTGRES_END_TS,
        },
        async (res) => checkCase(res, 'GetUniquenessEventsForFeatureMv3_model11', filterFeature),
      );
    });

    // Monitor runs page
    it('should match expected for GetAnalyzerRuns', async function () {
      await checkQuery(
        GetAnalyzerRunsDocument,
        {
          datasetId: 'model-11',
          from: 1735862400000,
          to: 1736294400000,
          limit: 30,
          offset: 0,
          sortDirection: SortDirection.Desc,
        },
        async (res) => checkCase(res, 'GetAnalyzerRuns_model11', filterAnalyzerRuns),
      );
    });

    // Monitor runs page
    it('should match expected for GetAnalyzerRunCount', async function () {
      await checkQuery(
        GetAnalyzerRunCountDocument,
        {
          datasetId: 'model-11',
          from: 1735862400000,
          to: 1736294400000,
        },
        async (res) => checkCase(res, 'GetAnalyzerRunCount_model11'),
      );
    });

    it('should match expected for GetAnalyzerRunCount with monitorId and analysisId', async function () {
      await checkQuery(
        GetAnalyzerRunCountDocument,
        {
          datasetId: 'model-11',
          monitorId: 'frequent-items-drift-monitor-xe6ekf',
          analyzerId: 'frequent-items-drift-analyzer-xe6ekf',
          from: 1735862400000,
          to: 1736294400000,
        },
        async (res) => checkCase(res, 'GetAnalyzerRunCountWithMonitorIdAnalyzerId_model11'),
      );
    });
  });

  describe('tests for model-14 (Empty project)', function () {
    // Classification project with no  data
    // Profiles page
    it('should match expected for GetLatestTimestamp', async function () {
      await checkQuery(
        GetLatestTimestampDocument,
        {
          modelId: 'model-14',
        },
        async (res) => checkCase(res, 'GetLatestTimestamp_model16'),
      );
    });

    // Profiles page
    it('should match expected for GetDataExistenceInformation', async function () {
      await checkQuery(
        GetDataExistenceInformationDocument,
        {
          datasetId: 'model-14',
        },
        async (res) => checkCase(res, 'GetDataExistenceInformation_model14'),
      );
    });
  });

  describe('tests for model-5 (Lots of outputs)', function () {
    // outputs page with some NaN drift values
    it('should match GetMultiFeatureDriftAnalysis', async function () {
      await checkQuery(
        GetMultiFeatureDriftAnalysisDocument,
        {
          datasetId: 'model-5',
          from: POSTGRES_START_TS,
          to: POSTGRES_END_TS,
          featureIds: [
            'output_alldiffdate',
            'output_alldifffloat',
            'output_alldiffint',
            'output_alldiffstr',
            'output_bigint',
            'output_constfloat',
            'output_constint',
            'output_contdate',
            'output_contint',
            'output_date',
            'output_float',
            'output_int',
            'output_int-doublingnull',
            'output_int-doublingunique',
            'output_mainlynullwithint',
            'output_nan',
            'output_nanthenfloat',
            'output_nanthenint',
            'output_nonethenint',
            'output_string',
            'output_string-halvingunique',
            'output_stringwithmissing',
            'output_strthenint',
          ],
          tags: [],
        },
        async (res) => {
          await checkCase(res, 'GetMultiFeatureDriftAnalysis_model5', filterAnalyzerResults);
          checkNullsInAnalysisResults(res.data?.analysisResults ?? []);
        },
      );
    });
  });

  describe('tests for model-3 (Seasonal)', function () {
    // Anomaly feed
    it('should match expected for GetPaginatedAnalysisResults', async function () {
      await checkQuery(
        GetPaginatedAnalysisResultsDocument,
        {
          anomaliesOnly: false,
          datasetId: 'model-3',
          from: POSTGRES_START_TS,
          to: POSTGRES_END_TS,
          limit: 30,
          offset: 0,
          sortDirection: SortDirection.Desc,
        },
        async (res) => {
          await checkCase(res, 'GetPaginatedAnalysisResults_model3', filterAnalyzerResults);
          checkNullsInAnalysisResults(res.data?.paginatedAnalysisResults ?? []);
        },
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

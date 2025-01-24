import { promises as fs } from 'fs';

import { cloneDeep, orderBy } from 'lodash';
import { prop, symmetricDifference, uniqBy } from 'ramda';

import { SECURITY_TAG } from '../../constants';
import { supportedNumericMetrics } from '../../graphql/contract-converters/data-service/numeric-metrics-converter';
import { AnalysisMetric, MetricQuery, TimePeriod } from '../../graphql/generated/graphql';
import {
  CLASSIFICATION_METRICS,
  REGRESSION_METRICS,
  standardMetricsSchemas,
} from '../../graphql/resolvers/helpers/data-metrics';
import { ACTUAL_DIR, checkCase } from '../helpers/checks';
import {
  CLASSIFICATION_MODEL,
  DASHBIRD_TEST_ORG,
  DASHBIRD_TEST_USER_EMAIL,
  QueryChecker,
  REGRESSION_MODEL,
  SEGMENTED_DATASET,
  TEST_FROM_PREV_7_DAYS,
  TEST_TO_TIMESTAMP,
  TestServer,
  expect,
  setupApolloServer,
  setupTestUser,
} from '../integration-common';
import {
  GetAvailableMetricsDocument,
  GetMetricDataDocument,
  GetMetricRollupForSegmentsDocument,
  GetMetricsByTagDocument,
  GetModelPerformanceDocument,
  GetSegmentMetricDataRollupDocument,
} from './generated/graphql';

type CustomMetricsResult = {
  data?: {
    resource: {
      segment: {
        customMetrics: {
          id?: string;
          name?: string;
          metadata: { label?: string; name?: string; description?: string };
          numericValues: { value?: number }[];
        }[];
      };
    };
  };
};

const filterCustomMetrics = (data: CustomMetricsResult): object => {
  const copy = cloneDeep(data) ?? {};
  if (!copy.data) return copy;
  copy.data.resource.segment.customMetrics = orderBy(copy.data?.resource.segment.customMetrics, [
    'metadata.queryDefinition.column',
    'metadata.queryDefinition.metric',
  ]);
  copy.data.resource.segment.customMetrics.forEach((m) => {
    delete m.id;
    // these values arent stable enough to be repeatable
    m.numericValues.forEach((v) => delete v.value);
    // these fields can be changed dynamically in default metadata
    delete m.metadata.label;
    delete m.metadata.description;
    delete m.metadata.name;
    delete m.name;
  });
  return copy;
};

const STR_SEGMENT_FEATURE = 'str'; // different across segments
const FLOAT_FEATURE = 'float';

const dataQualityMetrics = standardMetricsSchemas.filter((s) => s.tags?.includes('quality')).map((s) => s.name);

describe('Data Investigator GraphQL queries', function () {
  let checkQuery: QueryChecker = () => {
    throw Error('Query engine not started yet, cannot execute query.');
  };
  let testServer: TestServer | null = null;
  before(async function () {
    const testIdentity = await setupTestUser(DASHBIRD_TEST_USER_EMAIL, DASHBIRD_TEST_ORG);
    testServer = await setupApolloServer();
    await fs.stat(ACTUAL_DIR).catch(async (err) => {
      if (err.code === 'ENOENT') {
        await fs.mkdir(ACTUAL_DIR);
      }
    });
    checkQuery = async (query, variables, assertions, identity = testIdentity) => {
      if (testServer) {
        await testServer.checkQuery(query, variables, assertions, identity);
      }
    };
  });

  it('returns a result for each data quality getMetricData query', async function () {
    const queries: MetricQuery[] = Array.from(dataQualityMetrics).map((m) => ({
      datasetId: SEGMENTED_DATASET,
      metric: m,
      feature: FLOAT_FEATURE,
    }));
    await checkQuery(GetMetricDataDocument, { from: TEST_FROM_PREV_7_DAYS, to: TEST_TO_TIMESTAMP, queries }, (res) => {
      const results = res.data?.dataQueries?.getMetricData ?? [];
      expect(res.errors).to.be.undefined;
      expect(results.length).to.equal(queries.length);
      // check there are no duplicate timestamps, and that there are points
      results.forEach((r) => {
        expect(uniqBy(prop('timestamp'), r.points).length).to.equal(r.points.length);
        expect(r.points.length, `No data points returned for metric ${r.metric}`).to.be.greaterThan(0);
      });
    });
  });

  it('returns a result for each data quality metric queried separately', async function () {
    await Promise.all(
      Array.from(dataQualityMetrics).map(async (metric) => {
        const queries = [
          {
            datasetId: SEGMENTED_DATASET,
            metric,
            feature: FLOAT_FEATURE,
          },
        ];
        return checkQuery(
          GetMetricDataDocument,
          { from: TEST_FROM_PREV_7_DAYS, to: TEST_TO_TIMESTAMP, queries },
          (res) => {
            const results = res.data?.dataQueries?.getMetricData ?? [];
            expect(res.errors).to.be.undefined;
            expect(results.length, `No results for metric ${metric}`).to.equal(1);
            const r = results[0];
            expect(uniqBy(prop('timestamp'), r.points).length).to.equal(r.points.length);
            expect(r.points.length, `No points for metric ${metric}`).to.be.greaterThan(0);
          },
        );
      }),
    );
  });

  it('returns a result for getSegmentMetricDataRollup', async function () {
    const queries: MetricQuery[] = [
      {
        datasetId: SEGMENTED_DATASET,
        metric: AnalysisMetric.Count,
        feature: STR_SEGMENT_FEATURE,
      },
    ];
    await checkQuery(
      GetSegmentMetricDataRollupDocument,
      { from: TEST_FROM_PREV_7_DAYS, to: TEST_TO_TIMESTAMP, segmentKey: 'key1', queries },
      (res) => {
        const results = res.data?.dataQueries?.getSegmentMetricDataRollup ?? [];
        expect(res.errors).to.be.undefined;
        expect(results.length).to.equal(2);
        expect(results.map((r) => r.segmentGroup)).to.eql(['3', '4']);
      },
    );
  });

  it('returns a result for getMetricRollupForSegments', async function () {
    await checkQuery(
      GetMetricRollupForSegmentsDocument,
      {
        from: TEST_FROM_PREV_7_DAYS,
        to: TEST_TO_TIMESTAMP,
        datasetId: SEGMENTED_DATASET,
        metric: AnalysisMetric.Count,
        column: STR_SEGMENT_FEATURE,
        segments: [
          { key: 'key1', value: '3' },
          { key: 'key1', value: '4' },
        ],
      },
      (res) => {
        const results = res.data?.dataQueries?.getMetricRollupForSegments ?? [];
        expect(res.errors).to.be.undefined;
        expect(results.length).to.equal(2);
        expect(results.map((r) => r.segmentGroup)).to.eql(['3', '4']);
      },
    );
  });

  it('lists valid available metrics', async function () {
    await checkQuery(GetAvailableMetricsDocument, {}, (res) => {
      const results = res.data?.dataQueries?.availableMetrics ?? [];
      const diff1 = symmetricDifference(
        results.map((m) => m.name),
        Array.from(supportedNumericMetrics),
      );
      expect(res.errors, `Unexpected error ${res.errors && res.errors[0].message}`).to.be.undefined;
      expect(diff1.length, `Unexpected differences with supported analysis metrics ${diff1}`).to.equal(0);
    });
  });

  it('throws an error if asked for an unsupported metric', async function () {
    const queries = [
      {
        datasetId: SEGMENTED_DATASET,
        metric: AnalysisMetric.Histogram,
        feature: STR_SEGMENT_FEATURE,
      },
    ];

    await checkQuery(GetMetricDataDocument, { from: TEST_FROM_PREV_7_DAYS, to: TEST_TO_TIMESTAMP, queries }, (res) => {
      expect(res.errors?.length).to.equal(1);
      expect(res.errors && res.errors[0].message).to.equal('Metric(s) HISTOGRAM not supported');
    });
  });

  it('returns a result for each classification performance metric', async function () {
    const queries: MetricQuery[] = Array.from(CLASSIFICATION_METRICS).map((m) => ({
      datasetId: CLASSIFICATION_MODEL,
      metric: m,
    }));
    await checkQuery(GetMetricDataDocument, { from: TEST_FROM_PREV_7_DAYS, to: TEST_TO_TIMESTAMP, queries }, (res) => {
      const results = res.data?.dataQueries?.getMetricData ?? [];
      expect(res.errors).to.be.undefined;
      expect(results.length).to.equal(queries.length);
      // check there are no duplicate timestamps, and that there are points
      results.forEach((r) => {
        expect(uniqBy(prop('timestamp'), r.points).length).to.equal(r.points.length);
        expect(r.points.length, `No data points returned for metric ${r.metric}`).to.be.greaterThan(0);
      });
    });
  });

  it('returns a result for each regression performance metric', async function () {
    const queries: MetricQuery[] = Array.from(REGRESSION_METRICS).map((m) => ({
      datasetId: REGRESSION_MODEL,
      metric: m,
    }));
    await checkQuery(GetMetricDataDocument, { from: TEST_FROM_PREV_7_DAYS, to: TEST_TO_TIMESTAMP, queries }, (res) => {
      const results = res.data?.dataQueries?.getMetricData ?? [];
      expect(res.errors).to.be.undefined;
      expect(results.length).to.equal(queries.length);
      // check there are no duplicate timestamps, and that there are points
      results.forEach((r) => {
        const res = uniqBy(prop('timestamp'), r.points).length;
        expect(res).to.equal(r.points.length);
        expect(r.points.length, `No data points returned for metric ${r.metric}`).to.be.greaterThan(0);
      });
    });
  });

  it('handles queries which repeat metrics or columns', async function () {
    const queries: MetricQuery[] = [
      { datasetId: SEGMENTED_DATASET, metric: AnalysisMetric.Quantile_99, feature: FLOAT_FEATURE },
      { datasetId: SEGMENTED_DATASET, metric: AnalysisMetric.Mean, feature: FLOAT_FEATURE },
      { datasetId: SEGMENTED_DATASET, metric: AnalysisMetric.Mean, feature: 'key1' },
    ];
    await checkQuery(GetMetricDataDocument, { from: TEST_FROM_PREV_7_DAYS, to: TEST_TO_TIMESTAMP, queries }, (res) => {
      const results = res.data?.dataQueries?.getMetricData ?? [];
      expect(res.errors).to.be.undefined;
      expect(results.length).to.equal(queries.length);
      // check there are results for each query, with different values
      expect(results.map((r) => r.metric)).to.deep.eq([
        AnalysisMetric.Quantile_99,
        AnalysisMetric.Mean,
        AnalysisMetric.Mean,
      ]);
      expect(results.map((r) => r.feature)).to.deep.eq([FLOAT_FEATURE, FLOAT_FEATURE, 'key1']);
      expect(results[0].points[0].value).to.be.approximately(3.33, 0.01);
      expect(results[1].points[0].value).to.be.approximately(2.12, 0.01);
      expect(results[2].points[0].value).to.eq(3.5);
    });
  });

  /*
   * The following tests may fail if the default schema metadata has changed. They get filtered for the fields that are
   * expected to change, so if they do fail its possible the default metadata is now bad (e.g. missing columns that
   * we used to support). That's really hard to pick up any way other than this test, which is why I've left it in.
   * With apologies when it breaks due to a valid change to the metadata.
   */
  describe('LLM dashboard queries', function () {
    it('should match GetMetricsByTag for security', async function () {
      await checkQuery(
        GetMetricsByTagDocument,
        {
          resourceId: 'model-7',
          tags: SECURITY_TAG,
          from: 1692489600000,
          to: 1694217599999,
          granularity: TimePeriod.Pt1H,
        },
        async (res) => {
          await checkCase(res, 'GetMetricsByTag_security_di_model7', filterCustomMetrics);
        },
      );
    });
    it('should match GetMetricsByTag for performance', async function () {
      await checkQuery(
        GetMetricsByTagDocument,
        {
          resourceId: 'model-7',
          tags: ['performance'],
          from: 1692489600000,
          to: 1694217599999,
          granularity: TimePeriod.Pt1H,
        },
        async (res) => {
          await checkCase(res, 'GetMetricsByTag_performance_di_model7', filterCustomMetrics);
        },
      );
    });
  });

  describe('Custom performance metric queries', function () {
    it('should get custom metrics', async function () {
      await checkQuery(
        GetModelPerformanceDocument,
        {
          datasetId: 'model-9',
          from: 1692489600000,
          to: 1694217599999,
        },
        async (res) => checkCase(res, 'GetModelPerformance_di_model9'),
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

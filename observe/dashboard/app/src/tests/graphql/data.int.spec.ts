import { MILLIS_PER_DAY } from '../../constants';
import {
  CLASSIFICATION_MODEL,
  DASHBIRD_TEST_ORG,
  DASHBIRD_TEST_USER_EMAIL,
  DATA_STREAM_DATASET,
  DIFFERENT_TYPES_DATASET,
  LLM_MODEL,
  QueryChecker,
  REGRESSION_MODEL,
  SEGMENTED_DATASET,
  TEST_FROM_PREV_30_DAYS,
  TEST_FROM_PREV_7_DAYS,
  TEST_TO_TIMESTAMP,
  TestServer,
  expect,
  setupApolloServer,
  setupTestUser,
} from '../integration-common';
import {
  AssetCategory,
  BatchDateRangesDocument,
  GetAnalyzerRuns2Document,
  GetAnomalyCountDocument,
  GetDataExistenceInformationDocument,
  GetModelAnomalyCountsByCategoryDocument,
  GetModelsWithTypesDocument,
  GetOutputSparklinesDocument,
  GetSegmentDocument,
  ModelType,
  SegmentTag,
  SegmentsDocument,
} from './generated/graphql';

describe('GraphQL profile and analysis queries', function () {
  let checkQuery: QueryChecker = () => {
    throw Error('Query engine not started yet, cannot execute query.');
  };
  let testServer: TestServer | null = null;
  before(async function () {
    const testIdentity = await setupTestUser(DASHBIRD_TEST_USER_EMAIL, DASHBIRD_TEST_ORG);
    testServer = await setupApolloServer();
    checkQuery = async (query, variables, assertions, identity = testIdentity) => {
      if (testServer) {
        await testServer.checkQuery(query, variables, assertions, identity);
      }
    };
  });

  it('fetches data for segmented dataset', async function () {
    await checkQuery(GetDataExistenceInformationDocument, { datasetId: SEGMENTED_DATASET }, (res) => {
      const { dataAvailability, features, outputs, totalSegments } = res.data?.model ?? {};
      if (!dataAvailability || !features || !outputs || !totalSegments)
        throw Error('Missing basic model level fields for segmented dataset');

      expect(dataAvailability.hasData).to.be.true;
      expect(dataAvailability.oldestTimestamp).to.not.be.oneOf([null, undefined]);
      expect(features.length).to.eq(4);
      expect(totalSegments).to.be.eq(4);
    });
  });

  it('fetches data for dataset with outputs and perf metrics', async function () {
    await checkQuery(GetDataExistenceInformationDocument, { datasetId: REGRESSION_MODEL }, (res) => {
      const { dataAvailability, features, outputs, datasetMetrics } = res.data?.model ?? {};
      if (!dataAvailability || !features || !outputs || !datasetMetrics)
        throw Error('Missing basic model level fields for regression model');

      expect(dataAvailability.oldestTimestamp).to.not.be.oneOf([null, undefined]);
      expect(features.length).to.eq(1);
      expect(datasetMetrics.length).to.eq(3);
      expect(outputs.length).to.be.eq(2);
    });
  });

  it('fetches anomalies for different data types dataset', async function () {
    await checkQuery(
      GetModelAnomalyCountsByCategoryDocument,
      { model: DIFFERENT_TYPES_DATASET, from: TEST_FROM_PREV_30_DAYS, to: TEST_TO_TIMESTAMP },
      (res) => {
        const { totals, timeseries } = res.data?.model?.anomalyCounts ?? {};
        if (!totals || !timeseries) throw Error('There should be some anomalies for different types dataset');

        expect(totals.some((t) => t.count > 0)).to.be.true;
        expect(timeseries.length).to.be.gte(1);
        expect(timeseries.every((t) => !!t.timestamp)); // non-zero timestamps
      },
    );
  });

  it('fetches analyzer runs for different data types dataset', async function () {
    await checkQuery(
      GetAnalyzerRuns2Document,
      { model: DIFFERENT_TYPES_DATASET, from: TEST_TO_TIMESTAMP, to: Date.now() },
      (res) => {
        const { analyzerRuns } = res.data ?? {};
        if (!analyzerRuns?.length) throw Error('There should be some analyzer runs');
      },
    );
  });

  it('fetches v3 anomaly count for different data types dataset', async function () {
    await checkQuery(
      GetAnomalyCountDocument,
      { datasetId: DIFFERENT_TYPES_DATASET, from: TEST_FROM_PREV_30_DAYS, to: TEST_TO_TIMESTAMP },
      (res) => {
        const counts = res.data?.anomalyCount;
        if (!counts) throw Error('There should be anomaly counts for different data types dataset');

        expect(counts.length).to.be.gte(1);
        expect(counts.every((t) => !!t && !!t.timestamp)); // non-zero timestamps
      },
    );
  });

  it('fetches data for output', async function () {
    await checkQuery(
      GetOutputSparklinesDocument,
      { datasetId: REGRESSION_MODEL, from: TEST_FROM_PREV_30_DAYS, to: TEST_TO_TIMESTAMP },
      (res) => {
        const { outputs } = res.data?.model ?? {};
        if (!outputs?.length) throw Error('No outputs found');

        // TODO reinstate once have added monitors to regression model
        // const firstOutput = outputs[0];
        // const { analysisResults } = firstOutput;
        //
        // expect(analysisResults?.length ?? 0, 'output column should have some events').to.be.gt(0); // should have some events
      },
    );
  });

  it('fetches segment data', async function () {
    this.timeout(30000);
    await checkQuery(
      SegmentsDocument,
      {
        model: SEGMENTED_DATASET,
        from: TEST_FROM_PREV_7_DAYS,
        to: TEST_TO_TIMESTAMP,
        limit: 20,
        offset: 0,
        substring: null,
      },
      (res) => {
        const { totalSegments, segments } = res.data?.model ?? {};
        if (!totalSegments || !segments?.length) throw Error('No segments found');

        // at least some segments should have data and alerts
        const segmentsWithData = segments.filter((s) => !!s.batches.length);
        expect(segmentsWithData.length, 'segments should exist').to.be.gt(0);
        // TODO reinstate when have monitors for segmented dataset
        // const segmentsWithAlerts = segmentsWithData.filter((s) => !!s.anomalies?.length);
        // expect(segmentsWithAlerts.length, 'segments should have alerts').to.be.gt(0);
      },
    );
  });

  it('fetches merged segment data', async function () {
    const searchTags: SegmentTag[] = [{ key: 'key1', value: '3' }];
    await checkQuery(
      GetSegmentDocument,
      {
        datasetId: SEGMENTED_DATASET,
        tags: searchTags,
      },
      (res) => {
        const { dataAvailability, tags } = res.data?.model?.segment ?? {};
        if (!dataAvailability || !tags?.length) throw Error('Merged segment not found');

        expect(dataAvailability.hasData, 'merged segment should exist and have data').to.be.true;
        expect(tags, 'merged segment tags should match what we search for').to.deep.eq(searchTags);
      },
    );
  });

  it('does not fetch non-existent segments', async function () {
    const searchTags: SegmentTag[] = [{ key: 'foo', value: 'bar' }];
    await checkQuery(
      GetSegmentDocument,
      {
        datasetId: SEGMENTED_DATASET,
        tags: searchTags,
      },
      (res) => {
        const { segment } = res.data?.model ?? {};

        expect(segment, 'the specified segment should not exist in this dataset').not.to.exist;
      },
    );
  });

  it('gets batch date range for a known batch', async function () {
    await checkQuery(
      BatchDateRangesDocument,
      {
        modelId: SEGMENTED_DATASET,
        timestamps: [1609459200000],
      },
      (res) => {
        const { fromTimestamp, toTimestamp } = res.data?.model?.batchDateRanges[0] ?? {};
        expect(fromTimestamp).to.eq(1609459200000);
        expect(toTimestamp).to.eq(1609545600000);
      },
    );
  });

  it('gets batch date range for a timestamp in mid range', async function () {
    const now = new Date(2023, 0, 5, 10, 23).getTime();
    await checkQuery(
      BatchDateRangesDocument,
      {
        modelId: SEGMENTED_DATASET,
        timestamps: [now],
      },
      (res) => {
        const { fromTimestamp, toTimestamp } = res.data?.model?.batchDateRanges[0] ?? {};
        expect(fromTimestamp).to.not.be.oneOf([null, undefined]);
        expect(toTimestamp).to.not.be.oneOf([null, undefined]);
        expect(now - (fromTimestamp ?? 0), `From timestamp ${fromTimestamp} is too far from now`)
          .to.be.gte(0)
          .and.to.be.lt(MILLIS_PER_DAY);
        const diff = (toTimestamp ?? 0) - (fromTimestamp ?? 0);
        expect(diff, `Timestamp difference is not 1 day`).to.be.eq(MILLIS_PER_DAY);
      },
    );
  });

  it('gets date range for multiple timestamps', async function () {
    await checkQuery(
      BatchDateRangesDocument,
      {
        modelId: SEGMENTED_DATASET,
        timestamps: [1609459200000, 1609545600000],
      },
      (res) => {
        const [r0, r1] = res.data?.model?.batchDateRanges ?? [];
        expect(r0.toTimestamp).to.eq(1609545600000);
        expect(r1.toTimestamp).to.eq(1609632000000);
      },
    );
  });

  it('fetches model asset type/class information', async function () {
    await checkQuery(GetModelsWithTypesDocument, null, (res) => {
      const { models } = res.data ?? {};
      if (!models) throw Error('Assets should exist in this org');

      const classificationModel = models.find((m) => m.id === CLASSIFICATION_MODEL);
      expect(classificationModel).to.exist;
      expect(classificationModel?.modelType).to.eq(ModelType.Classification);
      expect(classificationModel?.assetCategory).to.eq(AssetCategory.Model);

      const dataStreamDataset = models.find((m) => m.id === DATA_STREAM_DATASET);
      expect(dataStreamDataset).to.exist;
      expect(dataStreamDataset?.modelType).to.eq(ModelType.DataStream);
      expect(dataStreamDataset?.assetCategory).to.eq(AssetCategory.Data);

      const llmResource = models.find((m) => m.id === LLM_MODEL);
      expect(llmResource).to.exist;
      expect(llmResource?.modelType).to.eq(ModelType.Llm);
      expect(llmResource?.assetCategory).to.eq(AssetCategory.Llm);
    });
  });

  after(async function () {
    if (testServer) {
      await testServer.serverCleanup();
      testServer = null;
    }
  });
});

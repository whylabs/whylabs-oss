import { renderHook } from '@testing-library/react-hooks';
import { AlertCategory, ModelOverviewInfoFragment, ModelType, TimePeriod } from 'generated/graphql';
import { AlertTimeseriesEmpty } from 'components/controls/table/cells/AnomalyTypes';
import { useModelOverviewInfoFragmentLists } from './useModelOverviewInfoFragmentLists';

describe('useModelOverviewInfoFragmentLists()', () => {
  it('should return empty lists', () => {
    const { result } = getHookRenderer([]);

    expect(result.current).toStrictEqual({
      modelBatchFrequencies: [],
      modelIds: [],
      modelLatestAnomalyTimestamps: [],
      modelNames: [],
      modelTimeseries: [],
      modelTotalFeatures: [],
      modelTotalOutputs: [],
      modelTotalSegments: [],
      modelTypes: [],
      modelTags: [[]],
    });
  });

  it('should return all lists from mock data', () => {
    const mockData = createMockData();

    const { result } = getHookRenderer([mockData]);
    expect(result.current).toStrictEqual({
      modelBatchFrequencies: ['Unknown'],
      modelIds: ['1'],
      modelLatestAnomalyTimestamps: [0],
      modelNames: ['mock name'],
      modelTimeseries: [AlertTimeseriesEmpty],
      modelTotalFeatures: ['0'],
      modelTotalOutputs: ['0'],
      modelTotalSegments: ['0'],
      modelTypes: ['UNKNOWN'],
      modelTags: [[], []],
    });
  });

  it('should return Batch Frequencies lists', () => {
    const { result } = getHookRenderer([
      createMockData({ batchFrequency: TimePeriod.All }),
      createMockData({ batchFrequency: TimePeriod.Pt1H }),
      createMockData({ batchFrequency: TimePeriod.P1D }),
      createMockData({ batchFrequency: TimePeriod.P1W }),
      createMockData({ batchFrequency: TimePeriod.P1M }),
      createMockData({ batchFrequency: TimePeriod.Unknown }),
    ]);

    expect(result.current).toStrictEqual(
      expect.objectContaining({
        modelBatchFrequencies: ['Unknown', 'Hourly', 'Daily', 'Weekly', 'Monthly', 'Unknown'],
      }),
    );
  });

  it('should return ids lists', () => {
    const { result } = getHookRenderer([
      createMockData({ id: '111' }),
      createMockData({ id: '222' }),
      createMockData({ id: '333' }),
    ]);

    expect(result.current).toStrictEqual(
      expect.objectContaining({
        modelIds: ['111', '222', '333'],
      }),
    );
  });

  it('should return LatestAnomalyTimestamps lists', () => {
    const { result } = getHookRenderer([
      createMockData({ latestAnomalyTimestamp: 1601414115 }),
      createMockData({ latestAnomalyTimestamp: 1686999325 }),
    ]);

    expect(result.current).toStrictEqual(
      expect.objectContaining({
        modelLatestAnomalyTimestamps: [1601414115, 1686999325],
      }),
    );
  });

  it('should return names lists', () => {
    const { result } = getHookRenderer([createMockData({ name: 'name 1' }), createMockData({ name: 'name 2' })]);

    expect(result.current).toStrictEqual(
      expect.objectContaining({
        modelNames: ['name 1', 'name 2'],
      }),
    );
  });

  describe('timeseries list', () => {
    it('should return using AlertTimeseriesEmpty when anomalyCounts is undefined', () => {
      const { result } = getHookRenderer([createMockData(), createMockData()]);

      expect(result.current).toStrictEqual(
        expect.objectContaining({
          modelTimeseries: [AlertTimeseriesEmpty, AlertTimeseriesEmpty],
        }),
      );
    });

    it('should return with an empty array when anomalyCounts.timeseries is empty', () => {
      const { result } = getHookRenderer([
        createMockData({ anomalyCounts: { totals: [], timeseries: [] } }),
        createMockData({ anomalyCounts: { totals: [], timeseries: [] } }),
      ]);

      expect(result.current).toStrictEqual(
        expect.objectContaining({
          modelTimeseries: [[], []],
        }),
      );
    });

    it('should return using anomalyCounts.timeseries', () => {
      const mock1 = createMockData({
        anomalyCounts: {
          totals: [],
          timeseries: [
            {
              counts: [
                {
                  category: AlertCategory.Ingestion,
                  count: 5,
                },
              ],
              timestamp: 1460624485,
            },
          ],
        },
      });
      const mock2 = createMockData({
        anomalyCounts: {
          totals: [],
          timeseries: [
            {
              counts: [
                {
                  category: AlertCategory.DataDrift,
                  count: 912,
                },
              ],
              timestamp: 1012334403,
            },
            {
              counts: [
                {
                  category: AlertCategory.DataQuality,
                  count: 123,
                },
              ],
              timestamp: 1385971154,
            },
          ],
        },
      });

      const { result } = getHookRenderer([mock1, mock2]);

      expect(result.current).toStrictEqual(
        expect.objectContaining({
          modelTimeseries: [mock1.anomalyCounts?.timeseries, mock2.anomalyCounts?.timeseries],
        }),
      );
    });
  });
  it('should return total features lists', () => {
    const { result } = getHookRenderer([
      createMockData({ entitySchema: { inputCounts: { total: 144 }, outputCounts: { total: 0 } } }),
      createMockData({ entitySchema: { inputCounts: { total: 5123 }, outputCounts: { total: 0 } } }),
      createMockData({ entitySchema: { inputCounts: { total: 623 }, outputCounts: { total: 3 } } }),
    ]);
    expect(result.current).toStrictEqual(
      expect.objectContaining({
        modelTotalFeatures: ['144', '5123', '623'],
        modelTotalOutputs: ['0', '0', '3'],
      }),
    );
  });

  it('should return total Segments lists', () => {
    const { result } = getHookRenderer([
      createMockData({ totalSegments: 512 }),
      createMockData({ totalSegments: 231 }),
      createMockData({ totalSegments: 807 }),
    ]);
    expect(result.current).toStrictEqual(
      expect.objectContaining({
        modelTotalSegments: ['512', '231', '807'],
      }),
    );
  });

  it('should return types lists', () => {
    const { result } = getHookRenderer([
      createMockData({ modelType: ModelType.Classification }),
      createMockData({ modelType: ModelType.Regression }),
      createMockData({ modelType: ModelType.Unknown }),
    ]);
    expect(result.current).toStrictEqual(
      expect.objectContaining({
        modelTypes: ['CLASSIFICATION', 'REGRESSION', 'UNKNOWN'],
      }),
    );
  });
});

// Helpers
function getHookRenderer(data: ModelOverviewInfoFragment[]) {
  return renderHook(() => useModelOverviewInfoFragmentLists(data));
}

function createMockData(custom: Partial<ModelOverviewInfoFragment> = {}): ModelOverviewInfoFragment {
  return {
    anomalyCounts: undefined,
    batchFrequency: TimePeriod.All,
    id: '1',
    modelType: ModelType.Unknown,
    name: 'mock name',
    entitySchema: { inputCounts: { total: 0 }, outputCounts: { total: 0 } },
    totalSegments: 0,
    resourceTags: [],
    ...custom,
  };
}

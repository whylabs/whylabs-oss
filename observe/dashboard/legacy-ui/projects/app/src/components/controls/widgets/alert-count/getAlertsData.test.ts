import { AlertCategory } from 'generated/graphql';
import { getAlertsData } from './getAlertsData';

const INGESTION_LABEL = 'Integration health';
const DATA_QUALITY_LABEL = 'Data quality';
const DRIFT_LABEL = 'Drift';
const MODEL_PERFORMANCE_LABEL = 'Model performance';

describe('getAlertsData', () => {
  it('should have zero alerts', () => {
    const result = getAlertsData({ data: [], isDataCategory: false });
    expect(result).toStrictEqual({
      alertCounts: [0, 0, 0, 0],
      alertLabels: [INGESTION_LABEL, DATA_QUALITY_LABEL, DRIFT_LABEL, MODEL_PERFORMANCE_LABEL],
      totalAlerts: 0,
    });
  });

  it('should return the correct data for a model', () => {
    const data = [
      {
        category: AlertCategory.Performance,
        count: 1,
      },
      {
        category: AlertCategory.DataQuality,
        count: 2,
      },
      {
        category: AlertCategory.Unknown,
        count: 3,
      },
      {
        category: AlertCategory.Performance,
        count: 9,
      },
      {
        category: AlertCategory.Performance,
        count: 3,
      },
    ];

    const result = getAlertsData({ data, isDataCategory: false });
    expect(result).toStrictEqual({
      alertCounts: [0, 2, 0, 13],
      alertLabels: [INGESTION_LABEL, DATA_QUALITY_LABEL, DRIFT_LABEL, MODEL_PERFORMANCE_LABEL],
      totalAlerts: 18,
    });
  });

  it('should return the correct data for a dataset', () => {
    const data = [
      {
        category: AlertCategory.Performance,
        count: 1,
      },
      {
        category: AlertCategory.Ingestion,
        count: 5,
      },
      {
        category: AlertCategory.DataQuality,
        count: 2,
      },
      {
        category: AlertCategory.DataDrift,
        count: 6,
      },
      {
        category: AlertCategory.Ingestion,
        count: 3,
      },
      {
        category: AlertCategory.Unknown,
        count: 3,
      },
    ];

    const result = getAlertsData({ data, isDataCategory: true });
    expect(result).toStrictEqual({
      alertCounts: [8, 2, 6],
      alertLabels: [INGESTION_LABEL, DATA_QUALITY_LABEL, DRIFT_LABEL],
      totalAlerts: 20,
    });
  });
});

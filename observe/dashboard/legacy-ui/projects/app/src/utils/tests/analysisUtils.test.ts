import { TimePeriod } from 'generated/graphql';
import { Granularity } from 'generated/monitor-schema';
import { MonitorSchema } from 'monitor-schema-types';
import { generateFixedThresholdAnomalyDescription } from 'utils/analysisUtils';

function generateTestSchema(granularity: Granularity, nConsecutive: number | undefined): MonitorSchema {
  return {
    orgId: '1',
    datasetId: '1',
    granularity,
    entitySchema: { columns: {} },
    analyzers: [{ id: 'target', config: { metric: 'foo', type: 'fixed', nConsecutive } }],
    monitors: [],
  };
}

describe('Tests for the n-consecutive threshold anomaly explanation', () => {
  it('should return standard explanation if the nConsecutive value is undefined', () => {
    const anomaly = {
      isAnomaly: true,
      analyzerType: 'fixed',
      threshold_metricValue: 0.1,
      threshold_absoluteLower: 0.2,
      threshold_absoluteUpper: 0.3,
      tags: [],
    };
    const schema = generateTestSchema('daily', undefined);
    expect(generateFixedThresholdAnomalyDescription(anomaly, schema)).toEqual('Observed value 0.1 < 0.2 threshold');
  });

  it('respects the digits parameter', () => {
    const anomaly = {
      isAnomaly: true,
      analyzerType: 'fixed',
      threshold_metricValue: 0.133,
      threshold_absoluteLower: 0.2,
      threshold_absoluteUpper: 0.3,
      tags: [],
    };
    const schema = generateTestSchema('daily', undefined);
    expect(generateFixedThresholdAnomalyDescription(anomaly, schema, 2)).toEqual('Observed value 0.13 < 0.2 threshold');
  });

  it('should return explanation with nConsecutive value if it is greater than 1', () => {
    const anomaly = {
      isAnomaly: true,
      analyzerType: 'fixed',
      analyzerId: 'target',
      threshold_metricValue: 0.1,
      threshold_absoluteLower: 0.2,
      threshold_absoluteUpper: 0.3,
      tags: [],
    };
    const schema = generateTestSchema('daily', 2);
    expect(generateFixedThresholdAnomalyDescription(anomaly, schema)).toEqual(
      'Observed value 0.1 < 0.2 threshold for at least 2 days',
    );
  });

  it('uses the analysis batch frequency rather than the schema if present', () => {
    const anomaly = {
      isAnomaly: true,
      analyzerType: 'fixed',
      analyzerId: 'target',
      threshold_metricValue: 0.1,
      threshold_absoluteLower: 0.2,
      threshold_absoluteUpper: 0.3,
      tags: [],
    };
    // Note that the daily version here is overridden by the value passed into the function
    const schema = generateTestSchema('daily', 2);
    expect(generateFixedThresholdAnomalyDescription(anomaly, schema, undefined, TimePeriod.Pt1H)).toEqual(
      'Observed value 0.1 < 0.2 threshold for at least 2 hours',
    );
  });
});

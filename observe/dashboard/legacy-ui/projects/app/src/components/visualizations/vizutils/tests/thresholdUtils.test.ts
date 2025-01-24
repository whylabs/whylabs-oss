import { ThresholdAnalysisDataFragment } from 'generated/graphql';
import { times } from 'ramda';
import {
  convertToNonNullFragments,
  createAreaDataForAnomalyThresholds,
  createLineDataForAnomalyThresholds,
  filterEmptyAndInvalidAnomalyThresholds,
  MonitorThresholdName,
  pickMonitorThresholdName,
} from '../thresholdUtils';

interface ThresholdParams {
  hasMetricValue?: boolean;
  hasAbsoluteUpper?: boolean;
  hasAbsoluteLower?: boolean;
  hasCalculatedUpper?: boolean;
  hasCalculatedLower?: boolean;
  anomalyDirection?: 'up' | 'down' | 'none';
  analyzerType?: 'fixed' | 'seasonal' | 'stddev';
}

function generateRandomizedThresholdFragment({
  hasMetricValue = true,
  hasAbsoluteLower = false,
  hasAbsoluteUpper = false,
  hasCalculatedLower = true,
  hasCalculatedUpper = true,
  anomalyDirection = 'none',
  analyzerType,
}: ThresholdParams): ThresholdAnalysisDataFragment {
  const lowerValue = anomalyDirection === 'none' || anomalyDirection === 'up' ? Math.random() : Math.random() + 3;
  const upperValue = anomalyDirection === 'none' || anomalyDirection === 'down' ? Math.random() + 3 : Math.random();
  const bumper = Math.random() / 2;

  let usedAnalyzerType = analyzerType;
  const coinFlipType = Math.random() > 0.5 ? 'stddev' : 'seasonal';
  if (!usedAnalyzerType) {
    usedAnalyzerType = hasAbsoluteLower || hasAbsoluteUpper ? 'fixed' : coinFlipType;
  }
  const thresholdFragment: ThresholdAnalysisDataFragment = {
    tags: [],
    threshold_metricValue: hasMetricValue ? Math.random() + 2 : null,
    threshold_absoluteLower: hasAbsoluteLower ? lowerValue - bumper : null,
    threshold_absoluteUpper: hasAbsoluteUpper ? upperValue + bumper : null,
    threshold_calculatedLower: hasCalculatedLower ? lowerValue : null,
    threshold_calculatedUpper: hasCalculatedUpper ? upperValue : null,
    analyzerType,
    datasetTimestamp: new Date().getTime(),
  };
  return thresholdFragment;
}

function generateCommonThresholdFragment(): ThresholdAnalysisDataFragment {
  return generateRandomizedThresholdFragment({ analyzerType: 'stddev' });
}

describe('Tests for threshold analysis helper functions', () => {
  it('filters out null values', () => {
    const firstCommon = generateCommonThresholdFragment();
    const secondCommon = generateCommonThresholdFragment();
    const noLower = generateRandomizedThresholdFragment({ hasCalculatedLower: false, analyzerType: 'stddev' });
    const thresholds = [firstCommon, null, secondCommon, noLower, null, null];
    const filtered = filterEmptyAndInvalidAnomalyThresholds(thresholds);
    expect(filtered).toHaveLength(3);
    expect(filtered).toEqual([firstCommon, secondCommon, noLower]);
  });

  it('filters out things that cannot happen but typescript does not believe it so we have to do this for coverage', () => {
    const coverageOnlyThing = generateCommonThresholdFragment();
    const normalOne = generateCommonThresholdFragment();
    delete coverageOnlyThing.datasetTimestamp;
    expect(convertToNonNullFragments([coverageOnlyThing, normalOne])).toHaveLength(1);
  });

  it('filters out anything without a metric value', () => {
    const firstCommon = generateCommonThresholdFragment();
    const noMetric = generateRandomizedThresholdFragment({ hasMetricValue: false, analyzerType: 'stddev' });
    const secondCommon = generateCommonThresholdFragment();
    const filtered = filterEmptyAndInvalidAnomalyThresholds([firstCommon, noMetric, secondCommon]);
    expect(filtered).toHaveLength(2);
    expect(filtered).toEqual([firstCommon, secondCommon]);
  });

  it('filtered out anything that has no thresholds', () => {
    const firstNoUpper = generateRandomizedThresholdFragment({
      hasCalculatedUpper: false,
      hasAbsoluteUpper: false,
      analyzerType: 'stddev',
    });
    const firstNoLower = generateRandomizedThresholdFragment({
      hasCalculatedLower: false,
      hasAbsoluteLower: false,
      analyzerType: 'seasonal',
    });
    const noBounds = generateRandomizedThresholdFragment({
      hasCalculatedLower: false,
      hasAbsoluteLower: false,
      hasAbsoluteUpper: false,
      hasCalculatedUpper: false,
      analyzerType: 'stddev',
    });
    const filtered = filterEmptyAndInvalidAnomalyThresholds([firstNoUpper, firstNoLower, noBounds]);
    expect(filtered).toHaveLength(2);
    expect(filtered).toEqual([firstNoUpper, firstNoLower]);
  });

  it('filters out bounds on the wrong type of threshold', () => {
    const noUpperSeasonal = generateRandomizedThresholdFragment({
      hasCalculatedUpper: false,
      analyzerType: 'seasonal',
      anomalyDirection: 'down',
    });
    const noLowerFixed = generateRandomizedThresholdFragment({
      hasCalculatedUpper: false,
      hasCalculatedLower: false,
      hasAbsoluteUpper: true,
      hasAbsoluteLower: false,
      analyzerType: 'fixed',
    });
    const wrongBoundariesFixed = generateRandomizedThresholdFragment({
      hasCalculatedUpper: true,
      hasCalculatedLower: true,
      hasAbsoluteUpper: false,
      hasAbsoluteLower: false,
      analyzerType: 'fixed',
    });
    const wrongBoundariesStddev = generateRandomizedThresholdFragment({
      hasCalculatedLower: false,
      hasCalculatedUpper: false,
      hasAbsoluteLower: true,
      hasAbsoluteUpper: true,
      analyzerType: 'stddev',
    });
    const filtered = filterEmptyAndInvalidAnomalyThresholds([
      noUpperSeasonal,
      wrongBoundariesFixed,
      noLowerFixed,
      wrongBoundariesStddev,
    ]);
    expect(filtered).toHaveLength(2);
    expect(filtered).toEqual([noUpperSeasonal, noLowerFixed]);
  });
});

describe('Creates lines from the thresholds', () => {
  const upperOnly = times(() => {
    return generateRandomizedThresholdFragment({ hasCalculatedLower: false, analyzerType: 'stddev' });
  }, 3);
  const lowerOnly = times(() => {
    return generateRandomizedThresholdFragment({ hasCalculatedUpper: false, analyzerType: 'seasonal' });
  }, 2);
  const { upper, lower } = createLineDataForAnomalyThresholds([
    upperOnly[0],
    null,
    lowerOnly[0],
    null,
    null,
    null,
    upperOnly[1],
    lowerOnly[1],
    upperOnly[2],
    null,
  ]);
  expect(upper).toHaveLength(3);
  expect(lower).toHaveLength(2);
  upper.forEach((item, idx) => {
    expect(item.x).toEqual(upperOnly[idx].datasetTimestamp);
    expect(item.y).toEqual(upperOnly[idx].threshold_calculatedUpper);
  });
  lower.forEach((item, idx) => {
    expect(item.x).toEqual(lowerOnly[idx].datasetTimestamp);
    expect(item.y).toEqual(lowerOnly[idx].threshold_calculatedLower);
  });
});

describe('Test the ability to create area threshold band segments', () => {
  it('Returns a single segment for all double-sided anomalies', () => {
    const doubleSidedFragments = times(generateCommonThresholdFragment, 3);
    const segments = createAreaDataForAnomalyThresholds(doubleSidedFragments);
    expect(segments).toHaveLength(1);
    expect(segments[0]).toHaveLength(3);
  });

  it('Returns one-side threshold area', () => {
    const missingUpperFragments = times(
      () => generateRandomizedThresholdFragment({ hasCalculatedUpper: false, analyzerType: 'stddev' }),
      2,
    );
    const missingLowerFragments = times(
      () => generateRandomizedThresholdFragment({ hasCalculatedLower: false, analyzerType: 'seasonal' }),
      5,
    );
    const segments = createAreaDataForAnomalyThresholds([...missingUpperFragments, ...missingLowerFragments]);
    expect(segments.length).toEqual(1);
    expect(segments[0].length).toEqual(missingUpperFragments.length + missingLowerFragments.length);
  });

  it('Returns a set of expected segments', () => {
    const firstMissingUpperFragments = times(
      () => generateRandomizedThresholdFragment({ hasCalculatedUpper: false, analyzerType: 'stddev' }),
      2,
    );
    const noThresholdFrigments = times(
      () =>
        generateRandomizedThresholdFragment({
          hasCalculatedUpper: false,
          hasCalculatedLower: false,
          analyzerType: 'stddev',
        }),
      1,
    );
    const missingLowerFragments = times(
      () => generateRandomizedThresholdFragment({ hasCalculatedLower: false, analyzerType: 'seasonal' }),
      7,
    );
    const firstDoubleSidedFragments = times(generateCommonThresholdFragment, 3);
    const secondDoubleSidedFragments = times(generateCommonThresholdFragment, 1);
    const thirdDoubleSidedFragments = times(generateCommonThresholdFragment, 7);
    const lastDoubleSidedFragments = times(generateCommonThresholdFragment, 6);

    const segments = createAreaDataForAnomalyThresholds([
      ...firstDoubleSidedFragments,
      ...firstMissingUpperFragments,
      ...secondDoubleSidedFragments,
      ...noThresholdFrigments, // segment gap
      ...thirdDoubleSidedFragments,
      ...missingLowerFragments,
      ...lastDoubleSidedFragments,
    ]);

    expect(segments).toHaveLength(2);
    expect(segments[0].length).toEqual(
      firstDoubleSidedFragments.length + firstMissingUpperFragments.length + secondDoubleSidedFragments.length,
    );
    expect(segments[1].length).toEqual(
      thirdDoubleSidedFragments.length + missingLowerFragments.length + lastDoubleSidedFragments.length,
    );
  });
});

describe('Testing our threshold description function', () => {
  it('returns Confidence Interval when there are both upper and lower bounds on all data', () => {
    const doubleSidedFragments = times(generateCommonThresholdFragment, 3);
    const outputName = pickMonitorThresholdName(doubleSidedFragments);
    expect(outputName).toEqual(MonitorThresholdName.Range);
  });

  it('returns confidence interval when there are both upper and lower-only items', () => {
    const uppers = times(
      () =>
        generateRandomizedThresholdFragment({
          hasCalculatedUpper: true,
          hasAbsoluteLower: false,
          hasCalculatedLower: false,
          analyzerType: 'stddev',
        }),
      3,
    );
    const lowers = times(
      () =>
        generateRandomizedThresholdFragment({
          hasCalculatedUpper: false,
          hasAbsoluteUpper: false,
          hasCalculatedLower: true,
          hasAbsoluteLower: true,
          analyzerType: 'stddev',
        }),
      3,
    );
    const outputName = pickMonitorThresholdName([...uppers, ...lowers]);
    expect(outputName).toEqual(MonitorThresholdName.Range);
  });

  it('returns Upper Threshold when there are only uppers', () => {
    const uppers = times(
      () =>
        generateRandomizedThresholdFragment({
          hasCalculatedUpper: true,
          hasAbsoluteLower: false,
          hasCalculatedLower: false,
          analyzerType: 'stddev',
        }),
      15,
    );
    const outputName = pickMonitorThresholdName(uppers);
    expect(outputName).toEqual(MonitorThresholdName.Upper);
  });

  it('returns Upper Threshold when there are only uppers and lower zeros that are out of order', () => {
    const uppers = times(
      () =>
        generateRandomizedThresholdFragment({
          hasCalculatedUpper: true,
          hasAbsoluteLower: false,
          hasCalculatedLower: false,
          analyzerType: 'stddev',
        }),
      15,
    ).map((up) => {
      return {
        ...up,
        threshold_absoluteUpper: -5,
        threshold_calculatedUpper: -4,
        threshold_absoluteLower: 0,
        threshold_calculatedLower: 0,
      };
    });
    const outputName = pickMonitorThresholdName(uppers);
    expect(outputName).toEqual(MonitorThresholdName.Upper);
  });

  it('returns Lower Threshold when there are only lowers', () => {
    const lowers = times(
      () =>
        generateRandomizedThresholdFragment({
          hasCalculatedUpper: false,
          hasAbsoluteUpper: false,
          hasCalculatedLower: true,
          hasAbsoluteLower: true,
          analyzerType: 'stddev',
        }),
      4,
    );
    const outputName = pickMonitorThresholdName(lowers);
    expect(outputName).toEqual(MonitorThresholdName.Lower);
  });

  it('returns Lower Threshold when there are only lowers and the uppers are out-of-order zeros', () => {
    const lowers = times(
      () =>
        generateRandomizedThresholdFragment({
          hasCalculatedUpper: false,
          hasAbsoluteUpper: false,
          hasCalculatedLower: true,
          hasAbsoluteLower: true,
          analyzerType: 'stddev',
        }),
      4,
    ).map((low) => {
      return {
        ...low,
        threshold_absoluteLower: 100,
        threshold_calculatedLower: 200,
        threshold_absoluteUpper: 0,
        threshold_calculatedUpper: 0,
      };
    });
    const outputName = pickMonitorThresholdName(lowers);
    expect(outputName).toEqual(MonitorThresholdName.Lower);
  });

  it('returns Confidence Interval when there are lower zeros that are in the correct order', () => {
    const uppers = times(
      () =>
        generateRandomizedThresholdFragment({
          hasCalculatedUpper: true,
          hasAbsoluteLower: false,
          hasCalculatedLower: false,
          analyzerType: 'stddev',
        }),
      15,
    ).map((up) => {
      return {
        ...up,
        threshold_absoluteUpper: 10,
        threshold_calculatedUpper: 11,
        threshold_absoluteLower: 0,
        threshold_calculatedLower: 0,
      };
    });
    const outputName = pickMonitorThresholdName(uppers);
    expect(outputName).toEqual(MonitorThresholdName.Range);
  });

  it('returns Confidence Interval when there are only lowers and the uppers are correct-order zeros', () => {
    const lowers = times(
      () =>
        generateRandomizedThresholdFragment({
          hasCalculatedUpper: false,
          hasAbsoluteUpper: false,
          hasCalculatedLower: true,
          hasAbsoluteLower: true,
          analyzerType: 'stddev',
        }),
      4,
    ).map((low) => {
      return {
        ...low,
        threshold_absoluteLower: -100,
        threshold_calculatedLower: -200,
        threshold_absoluteUpper: 0,
        threshold_calculatedUpper: 0,
      };
    });
    const outputName = pickMonitorThresholdName(lowers);
    expect(outputName).toEqual(MonitorThresholdName.Range);
  });
});

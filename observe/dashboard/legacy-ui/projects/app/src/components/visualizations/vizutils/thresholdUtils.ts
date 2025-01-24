import { ThresholdAnalysisDataFragment } from 'generated/graphql';
import { isExactlyNullOrUndefined } from 'utils';
import { getThresholdUpper, getThresholdLower } from 'utils/analysisUtils';
import { Colors } from '@whylabs/observatory-lib';
import { AreaDatum, LineDatum } from './types';
import { isNumber } from '../../../utils/typeGuards';

type NullableThresholdFragment = ThresholdAnalysisDataFragment | null;

function hasMetricValue(anom: ThresholdAnalysisDataFragment): boolean {
  return !isExactlyNullOrUndefined(anom.threshold_metricValue);
}

function hasAtLeastOneBoundary(anom: ThresholdAnalysisDataFragment): boolean {
  return !isExactlyNullOrUndefined(getThresholdLower(anom)) || !isExactlyNullOrUndefined(getThresholdUpper(anom));
}

export function filterEmptyAndInvalidAnomalyThresholds(
  anomalies: NullableThresholdFragment[],
): ThresholdAnalysisDataFragment[] {
  const nonNulls = anomalies.filter((an) => !!an).map((an) => an as ThresholdAnalysisDataFragment);
  return nonNulls.filter((anom) => hasMetricValue(anom) && hasAtLeastOneBoundary(anom));
}

type TDFWithDate = ThresholdAnalysisDataFragment & { datasetTimestamp: number };

export function convertToNonNullFragments(anomalies: NullableThresholdFragment[]): TDFWithDate[] {
  return anomalies.filter((an) => !!an && an.datasetTimestamp).map((an) => an as TDFWithDate);
}

type ThresholdPair = { low: number | null; high: number | null };
export function determineValidThresholds(tdf: TDFWithDate): ThresholdPair {
  const possibleLow = getThresholdLower(tdf);
  const possibleHigh = getThresholdUpper(tdf);
  if (!isExactlyNullOrUndefined(possibleLow)) {
    if (isExactlyNullOrUndefined(possibleHigh)) {
      return { low: possibleLow, high: null };
    }
    if (possibleHigh <= possibleLow && possibleLow === 0) {
      // Then one of these is a fake zero
      return { low: null, high: possibleHigh };
    }
    if (possibleHigh <= possibleLow && possibleHigh === 0) {
      return { low: possibleLow, high: null };
    }
    return { low: possibleLow, high: possibleHigh };
  }
  // so the low is null or undefined
  return isExactlyNullOrUndefined(possibleHigh) ? { low: null, high: null } : { low: null, high: possibleHigh };
}

export function createLineDataForAnomalyThresholds(anomalies: NullableThresholdFragment[]): {
  upper: LineDatum[];
  lower: LineDatum[];
} {
  const upper: LineDatum[] = [];
  const lower: LineDatum[] = [];
  const nonNulls = convertToNonNullFragments(anomalies);
  nonNulls.forEach((nn) => {
    if (!hasMetricValue(nn)) {
      return;
    }
    const { low, high } = determineValidThresholds(nn);
    if (!isExactlyNullOrUndefined(low)) {
      lower.push({ x: nn.datasetTimestamp, y: low });
    }
    if (!isExactlyNullOrUndefined(high)) {
      upper.push({ x: nn.datasetTimestamp, y: high });
    }
  });
  return { upper, lower };
}

export function createAreaDataForAnomalyThresholds(anomalies: NullableThresholdFragment[]): AreaDatum[][] {
  const nonNulls = convertToNonNullFragments(anomalies);
  const segments: AreaDatum[][] = [];
  let currentBand: AreaDatum[] | null = null;
  nonNulls.forEach((anom) => {
    const low = getThresholdLower(anom);
    const high = getThresholdUpper(anom);
    if (
      (isExactlyNullOrUndefined(high) && isExactlyNullOrUndefined(low)) ||
      (isNumber(high) && isNumber(low) && high < low)
    ) {
      if (currentBand) {
        segments.push(currentBand);
        currentBand = null;
      }
      return;
    }
    if (!currentBand) {
      currentBand = [];
    }
    currentBand.push({ x: anom.datasetTimestamp, y0: low ?? null, y1: high ?? null });
  });
  if (currentBand) {
    segments.push(currentBand);
  }
  return segments;
}

export enum MonitorThresholdName {
  Range = 'Analysis threshold',
  Lower = 'Lower Threshold',
  Upper = 'Upper Threshold',
}

function thresholdsAreValid(analysisData: ThresholdAnalysisDataFragment): { upper: boolean; lower: boolean } {
  const validityObject = { upper: false, lower: false };
  const lowerThreshold = getThresholdLower(analysisData);
  const upperThreshold = getThresholdUpper(analysisData);
  if (!isExactlyNullOrUndefined(lowerThreshold)) {
    validityObject.lower =
      lowerThreshold !== 0 || isExactlyNullOrUndefined(upperThreshold) || lowerThreshold < upperThreshold;
  }
  if (!isExactlyNullOrUndefined(upperThreshold)) {
    validityObject.upper =
      upperThreshold !== 0 || isExactlyNullOrUndefined(lowerThreshold) || upperThreshold > lowerThreshold;
  }
  return validityObject;
}

export const DEFAULT_THRESHOLD_AREA_FILL_OPACITY = 0.55;
export const DEFAULT_THRESHOLD_AREA_STROKE = Colors.quantileMedium;

export function pickMonitorThresholdName(analysisData: ThresholdAnalysisDataFragment[]): MonitorThresholdName {
  let foundUpper = false;
  let foundLower = false;
  analysisData.every((ad) => {
    const validity = thresholdsAreValid(ad);
    if (validity.upper) {
      foundUpper = true;
    }
    if (validity.lower) {
      foundLower = true;
    }
    return !(foundUpper && foundLower);
  });
  if (foundUpper && !foundLower) {
    return MonitorThresholdName.Upper;
  }
  if (foundLower && !foundUpper) {
    return MonitorThresholdName.Lower;
  }
  return MonitorThresholdName.Range;
}

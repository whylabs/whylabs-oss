import { stringMax } from '@whylabs/observatory-lib';
import {
  AnalysisDataFragment,
  EventArchetype,
  EventParam,
  EventType,
  Maybe,
  ThresholdAnalysisDataFragment,
} from 'generated/graphql';

export interface AlertData {
  alertId: string;
  type: EventType;
  archetype: EventArchetype;
  alertTimestampInMillis: number;
  feature: string;
  // The field DataQualityEvent.severity is deprecated.
  // Currently not a human-interpretable parameter, do not expose in UI
  // severity: number;
  runId?: Maybe<string>;
  segment?: string;
  metric?: Maybe<string>;
  isFalseAlarm?: Maybe<boolean>;
  thresholdExplanation?: {
    value: number;
    minThreshold?: Maybe<EventParam>;
    maxThreshold?: Maybe<EventParam>;
    message?: string;
  };
  dataTypeExplanation?: {
    value: string;
    previousValue: string;
  };
  isAnomaly?: Maybe<boolean>; // not supported for MV2 events, adding this here as a hacky way to allow anomaly filters for mv3 events
}

function inequalitySymbol(left: number, right: number): string {
  if (left < right) {
    return '<';
  }
  if (left === right) {
    return '=';
  }
  if (left > right) {
    return '>';
  }
  return '!=';
}

export const isAnalysisData = (anomaly?: AnalysisDataFragment | null): anomaly is AnalysisDataFragment => {
  return anomaly?.algorithmMode !== undefined;
};

export const FREQUENT_STRINGS_OPERATORS = ['eq', 'baseline_includes_all_target', 'target_includes_all_baseline'];
type frequentStringOperator = typeof FREQUENT_STRINGS_OPERATORS[number];
export const FREQUENT_STRINGS_BASE_STRINGS = [
  'Observed frequent items differ from baseline',
  'Unexpected frequent items found',
  'Observed frequent items do not include all expected values',
];
export const FREQUENT_STRINGS_MAP: Map<frequentStringOperator, typeof FREQUENT_STRINGS_OPERATORS[number]> = new Map([
  [FREQUENT_STRINGS_OPERATORS[0], FREQUENT_STRINGS_BASE_STRINGS[0]],
  [FREQUENT_STRINGS_OPERATORS[1], FREQUENT_STRINGS_BASE_STRINGS[1]],
  [FREQUENT_STRINGS_OPERATORS[2], FREQUENT_STRINGS_BASE_STRINGS[2]],
]);
const FREQUENT_STRINGS_SAMPLE_STRINGS = [
  'Incorrect values include',
  'Unexpected values include',
  'Missing expected values include',
];
export const FREQUENT_STRINGS_SAMPLE_MAP: Map<frequentStringOperator, typeof FREQUENT_STRINGS_SAMPLE_STRINGS[number]> =
  new Map([
    [FREQUENT_STRINGS_OPERATORS[0], FREQUENT_STRINGS_SAMPLE_STRINGS[0]],
    [FREQUENT_STRINGS_OPERATORS[1], FREQUENT_STRINGS_SAMPLE_STRINGS[1]],
    [FREQUENT_STRINGS_OPERATORS[2], FREQUENT_STRINGS_SAMPLE_STRINGS[2]],
  ]);

const FREQUENT_STRINGS_OK_STRINGS = [
  'Frequent items are the same as the baseline',
  'Baseline includes all of the frequent items',
  'All of the frequent items are in the baseline',
];
const FREQUENT_STRINGS_OK_MAP: Map<frequentStringOperator, typeof FREQUENT_STRINGS_OPERATORS[number]> = new Map([
  [FREQUENT_STRINGS_OPERATORS[0], FREQUENT_STRINGS_OK_STRINGS[0]],
  [FREQUENT_STRINGS_OPERATORS[1], FREQUENT_STRINGS_OK_STRINGS[1]],
  [FREQUENT_STRINGS_OPERATORS[2], FREQUENT_STRINGS_OK_STRINGS[2]],
]);

interface abbreviatedStringLengthProps {
  items: string[];
  maxLength: number;
  maxItems: number;
}
export function generateAbbreviatedStringList({ items, maxLength, maxItems }: abbreviatedStringLengthProps): string {
  if (maxItems === 0) {
    return '';
  }
  return items
    .slice(0, maxItems)
    .map((it) => stringMax(it, maxLength))
    .join(', ');
}

const DEFAULT_MAX_STRING_LENGTH = 12;
const DEFAULT_MAX_STRING_COUNT = 5;
export function createFrequentStringsAnomalyText(anomaly: AnalysisDataFragment): string[] {
  const explanationText: string[] = [];
  if (anomaly.analyzerType !== 'frequent_string_comparison') {
    return [];
  }
  const operator: frequentStringOperator = anomaly.frequentStringComparison_operator ?? 'eq';
  const coreString = FREQUENT_STRINGS_MAP.get(operator);
  if (!coreString) {
    return [];
  }
  explanationText.push(coreString);
  const sampleString = generateAbbreviatedStringList({
    items: anomaly.frequentStringComparison_sample ?? [],
    maxLength: DEFAULT_MAX_STRING_LENGTH,
    maxItems: DEFAULT_MAX_STRING_COUNT,
  });
  if (sampleString && FREQUENT_STRINGS_SAMPLE_MAP.get(operator)) {
    explanationText.push(`${FREQUENT_STRINGS_SAMPLE_MAP.get(operator)} ${sampleString}`);
  }
  return explanationText;
}

// For use in anomaly feed
export function createFrequentStringsEventDescription(anomaly: AnalysisDataFragment): string {
  if (anomaly.analyzerType !== 'frequent_string_comparison') {
    return '';
  }
  const operator: frequentStringOperator = anomaly.frequentStringComparison_operator ?? 'eq';
  if (anomaly.isAnomaly) {
    const message = FREQUENT_STRINGS_MAP.get(operator);
    return message ?? 'Frequent items do not match baseline';
  }
  const okMessage = FREQUENT_STRINGS_OK_MAP.get(operator);
  return okMessage ?? 'Frequent items match baseline';
}

export const anomalyTooltipText = (
  anomaly: AnalysisDataFragment,
  adHocRunId: string | undefined = undefined,
  digits = 3,
): string | null => {
  if (
    anomaly.analyzerType === 'drift' &&
    typeof anomaly.drift_metricValue === 'number' &&
    typeof anomaly.drift_threshold === 'number'
  ) {
    const symbol = inequalitySymbol(anomaly.drift_metricValue, anomaly.drift_threshold);
    return `Drift of: ${Number(anomaly.drift_metricValue.toFixed(digits))} ${symbol} ${
      anomaly.drift_threshold
    } threshold`;
  }
  return null;
};

export const getAlertTime = (
  alert: AlertData | AnalysisDataFragment | ThresholdAnalysisDataFragment | undefined | null,
): number => {
  if (alert && 'datasetTimestamp' in alert && typeof alert.datasetTimestamp === 'number') {
    return alert.datasetTimestamp;
  }
  // Do we want to return 0 here?
  return 0;
};

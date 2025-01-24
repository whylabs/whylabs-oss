import { FrequentItemsFieldsFragment, TimePeriod } from 'generated/graphql';
import { TrailingWindowBaseline, ReferenceProfileId, TimeRangeBaseline } from 'generated/monitor-schema';
import { JSONObject } from 'types/genericTypes';
import { translateJsonObject } from 'utils/JsonUtils';
import { batchFrequencyToUnitText, getBatchStep } from 'utils/timeUtils';
import { ScaleLinear } from 'd3-scale';
import { isString } from 'utils/typeGuards';
import { getFullDateFromISO } from 'utils/dateUtils';
import { SimpleDateRange } from 'utils/dateRangeUtils';

type SupportedBaselineType = TrailingWindowBaseline['type'] | ReferenceProfileId['type'] | TimeRangeBaseline['type'];

export const LEGEND_HEIGHT = 20;
export const BATCH_GRAPH_HORIZONTAL_BUFFER = 10;
export const OTHER_NAME = 'Other';
export const OTHER_OTHER_NAME = 'Infrequent items';

export interface GraphDatum {
  name: string;
  batchCount?: number;
  referenceCount?: number;
}

export const dropShadowStyle = {
  dropShadow: '0px 5px 10px rgba(0, 0, 0, 0.15)',
};

export function getD3FormattingString(scale: ScaleLinear<number, number>, percentage = false): string {
  const domain = scale.domain();
  const totalDomain = Math.abs(domain[domain.length - 1] - domain[0]);
  let formattingString = '.2s';
  if (percentage) {
    formattingString = '~p';
  } else if (totalDomain < 10 && totalDomain > 1e-3) {
    formattingString = '.3';
  } else if (totalDomain <= 1e-3) {
    formattingString = '~e';
  }
  return formattingString;
}

export function createGraphDataMap(frequentItems?: FrequentItemsFieldsFragment): GraphDatum[] {
  return (
    frequentItems?.frequentItems
      ?.filter((item) => !!item.value)
      .map((item) => ({ name: item.value!, batchCount: item.estimate ?? undefined }))
      .sort((a, b) => (b.batchCount ?? 0) - (a.batchCount ?? 0)) || []
  );
}

export function filterDatumToTopTenAndOther(data: GraphDatum[]): GraphDatum[] {
  if (data.length <= 10) {
    return data;
  }
  const copyData = [...data];
  const sortByBatch = copyData.sort((a, b) => (b.batchCount ?? 0) - (a.batchCount ?? 0));
  const topTenBatch = sortByBatch.slice(0, 10);
  const usedOtherName = copyData.some((datum) => datum.name === OTHER_NAME) ? OTHER_OTHER_NAME : OTHER_NAME;
  const otherBatchCount = sortByBatch.slice(10).reduce((acc, curr) => acc + (curr.batchCount ?? 0), 0);

  const hasReferenceCount = data.some((datum) => datum.referenceCount !== undefined);
  const missedReference: GraphDatum[] = [];
  let otherReferenceCount: number | undefined;
  if (hasReferenceCount) {
    const sortByReference = copyData.sort((a, b) => (b.referenceCount ?? 0) - (a.referenceCount ?? 0));
    const topTenReference = sortByReference.slice(0, 10);
    otherReferenceCount = sortByReference.slice(10).reduce((acc, curr) => acc + (curr.referenceCount ?? 0), 0);

    missedReference.push(...topTenReference.filter((datum) => !topTenBatch.some((d) => d.name === datum.name)));
  }
  const otherItems: GraphDatum[] = [];
  if (otherBatchCount !== undefined || otherReferenceCount !== undefined) {
    otherItems.push({ name: usedOtherName, batchCount: otherBatchCount, referenceCount: otherReferenceCount });
  }
  return [...topTenBatch, ...missedReference, ...otherItems];
}

function getJsonObjectFromStringValue(value: string): JSONObject | null {
  try {
    return translateJsonObject(JSON.parse(value));
  } catch (_e) {
    return null;
  }
}

function getBaselineFromPotentialAnalyzer(potentialAnalyzer: string): JSONObject | null {
  const jsonObject = getJsonObjectFromStringValue(potentialAnalyzer);
  if (jsonObject && 'config' in jsonObject) {
    const config = translateJsonObject(jsonObject.config);
    if (config && 'baseline' in config) {
      return translateJsonObject(config.baseline);
    }
  }
  return null;
}

export function getBaseLineTypeFromPotentialAnalyzer(potentialAnalyzer: string): SupportedBaselineType | null {
  const potentialBaseline = getBaselineFromPotentialAnalyzer(potentialAnalyzer);
  if (potentialBaseline && 'type' in potentialBaseline) {
    const baselineTypeString = potentialBaseline.type as string;
    if (baselineTypeString === 'TrailingWindow') {
      return 'TrailingWindow';
    }
    if (baselineTypeString === 'Reference') {
      return 'Reference';
    }
    if (baselineTypeString === 'TimeRange') {
      return 'TimeRange';
    }
  }
  return null;
}

export function getTrailingWindowSizeFromAnalyzer(potentialAnalyzer: string): number | null {
  const baseline = getBaselineFromPotentialAnalyzer(potentialAnalyzer);
  if (baseline && 'size' in baseline) {
    return baseline.size as number;
  }
  return null;
}

export function getTimeRangeFromAnalyzer(potentialAnalyzer: string): SimpleDateRange | null {
  const baseline = getBaselineFromPotentialAnalyzer(potentialAnalyzer);
  if (baseline && 'range' in baseline) {
    const translatedBaseline = translateJsonObject(baseline.range);
    const { start, end } = translatedBaseline ?? {};
    if (start && end && isString(start) && isString(end)) {
      return { from: new Date(start).getTime(), to: new Date(end).getTime() };
    }
  }
  return null;
}

export function getReferenceProfileIdFromPotentialAnalyzer(potentialAnalyzer: string): string | null {
  const baseline = getBaselineFromPotentialAnalyzer(potentialAnalyzer);
  if (baseline && 'profileId' in baseline) {
    return baseline.profileId as string;
  }
  return null;
}

const SIMPLE_TIME_PERIODS = [TimePeriod.Pt1H, TimePeriod.P1D, TimePeriod.P1W];

export function calculateTrailingWindowTimestamps(
  selectedTimestamp: number,
  windowSize: number,
  batchFrequency: TimePeriod,
): [number, number] {
  const end = selectedTimestamp;
  if (SIMPLE_TIME_PERIODS.includes(batchFrequency)) {
    return [end - getBatchStep(batchFrequency) * windowSize, end];
  }
  if (batchFrequency === TimePeriod.P1M) {
    const dateToManipulate = new Date(end);
    dateToManipulate.setUTCMonth(dateToManipulate.getUTCMonth() - windowSize);
    return [dateToManipulate.getTime(), end];
  }
  return [0, 0];
}

export function generateTrailingWindowDisplayName(windowSize: number | null, batchFrequency: TimePeriod): string {
  if (windowSize === null) return '';

  const unitText = batchFrequencyToUnitText(batchFrequency);
  if (windowSize === 1) {
    return `Trailing ${unitText}`;
  }
  return `Trailing ${windowSize} ${unitText}s`;
}

export function generateReferenceRangeDisplayName(range: SimpleDateRange | null): string {
  if (!range?.from || !range.to) return '';
  const startDate = new Date(range.from);
  const endDate = new Date(range.to);
  return `${getFullDateFromISO(startDate.toISOString())} to ${getFullDateFromISO(endDate.toISOString())}`;
}

type GranularityHandlers = {
  profileCount: number;
  periodLabel: string;
};
export const getDefaultProfilesByGranularity = new Map<TimePeriod, GranularityHandlers>([
  [
    TimePeriod.Pt1H,
    {
      profileCount: 24,
      periodLabel: 'hours',
    },
  ],
  [
    TimePeriod.P1D,
    {
      profileCount: 7,
      periodLabel: 'days',
    },
  ],
  [
    TimePeriod.P1W,
    {
      profileCount: 4,
      periodLabel: 'weeks',
    },
  ],
  [
    TimePeriod.P1M,
    {
      profileCount: 3,
      periodLabel: 'months',
    },
  ],
]);

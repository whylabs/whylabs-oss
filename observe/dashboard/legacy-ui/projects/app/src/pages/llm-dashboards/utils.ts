import { AnalysisMetric, FrequentItemUnitFieldsFragment, MetricDataFragment, MetricKind } from 'generated/graphql';
import { LineChartDatum } from 'types/graphTypes';
import { Colors } from '@whylabs/observatory-lib';

export type CardColumnKey = 'primary' | 'comparison';

export interface StackedTimestampedBar {
  timestamp: number;
  values: string[];
  estimates: number[];
}
const OTHER_CATEGORY_NAME = 'Other';
const ALT_OTHER_CATEGORY_NAME = 'Remaining data';
interface NumericData {
  timestamp: number;
  value: number;
}
export type DistributionValues = NonNullable<MetricDataFragment['distributionValues']>;
export const nonAverageMetrics = [AnalysisMetric.Median, AnalysisMetric.Mean];

export const mapContinuousMetricChartData = (
  numericValues: MetricDataFragment['numericValues'],
  metricName: string,
): LineChartDatum[] => {
  if (!numericValues) return [];
  return numericValues.map((datum) => {
    return {
      dateInMillis: datum.timestamp,
      values: [datum.value],
      colors: [Colors.chartPrimary],
      labels: [metricName],
    };
  });
};

const metricToMapKey = (metric: MetricDataFragment): string => {
  const { metric: analysisMetric } = metric.metadata?.queryDefinition ?? {};
  return `${metric.name}--${analysisMetric ?? 'UNKNOWN'}`;
};

export const filterContinuousMetrics = (metrics: MetricDataFragment[]): MetricDataFragment[] => {
  return metrics?.filter((metric) => !!metric.metadata?.tags && metric.metadata.metricKind !== MetricKind.Distribution);
};

export const metricDataToMapEntries = (data?: MetricDataFragment[]): Array<[string, MetricDataFragment]> =>
  data?.map((metric) => [metricToMapKey(metric), metric]) ?? [];

export const mergeMetrics = (
  primaryData: MetricDataFragment[] = [],
  secondaryData: MetricDataFragment[] = [],
): string[] => {
  const sortByData = (primary: MetricDataFragment, compared: MetricDataFragment) => {
    const hasData = (f: MetricDataFragment) =>
      !!(f?.distributionValues?.some((d) => d.frequentItems?.length) || f?.numericValues?.length);
    if (hasData(primary) === hasData(compared)) return 0;
    if (hasData(primary)) return -1;
    return 1;
  };

  const sortedData = primaryData
    .concat(secondaryData)
    .sort((a, b) => sortByData(a, b) || a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
  return Array.from(new Set<string>(sortedData.map(metricToMapKey)));
};

const getRangeOfValues = (data: NumericData[]) => {
  const mappedValues = data.map(({ value }) => value);
  if (!mappedValues.length) return '-';
  const min = Number(Math.min(...mappedValues).toFixed(3)) ?? 0;
  const max = Number(Math.max(...mappedValues).toFixed(3)) ?? 0;
  if (min !== max) return `${min} - ${max}`;
  return min;
};

export const calculateTimeseriesAverageValue = (data: NumericData[] | null): number => {
  const aggregatedValue =
    data?.reduce((acc, curr) => {
      return acc + (curr.value ?? 0);
    }, 0) ?? 0;
  return aggregatedValue / (data?.length || 1);
};

export const calculateDiscreteAggregatedCategories = (data: DistributionValues | null): number => {
  const aggregatedValue =
    data?.reduce((acc, curr) => {
      const aggregatedCategories = curr?.frequentItems?.reduce((sum, item) => {
        return sum + (item?.estimate ?? 0);
      }, 0);
      return acc + (aggregatedCategories ?? 0);
    }, 0) ?? 0;
  return aggregatedValue;
};

export const getCustomMetricHeroValue = (metric: MetricDataFragment): string | number => {
  const analysisMetric = metric.metadata?.queryDefinition?.metric;
  if (!metric.numericValues?.length && !metric.distributionValues?.length) return '-';
  if (analysisMetric === AnalysisMetric.Median) {
    return getRangeOfValues(metric.numericValues ?? []);
  }
  if (metric.metadata?.metricKind === MetricKind.Amount) {
    const test = calculateTimeseriesAverageValue(metric.numericValues ?? []).toFixed(4);
    return Number(test);
  }
  return Number(calculateDiscreteAggregatedCategories(metric.distributionValues ?? []).toFixed(4));
};

export function classifyVisibleItems(
  data: DistributionValues,
  namedItems = 5,
): { shownCategories: [string, number][]; otherCategories: [string, number][]; otherName: string } {
  if (!data || data.length === 0) {
    return { shownCategories: [], otherCategories: [], otherName: OTHER_CATEGORY_NAME };
  }

  const countedCategories = data.reduce((acc, curr) => {
    if (curr && curr.frequentItems) {
      curr.frequentItems.forEach((item) => {
        const { value, estimate } = item;
        if (value && estimate) {
          if (acc.has(value)) {
            acc.set(value, acc.get(value) ?? 0 + estimate);
          } else {
            acc.set(value, estimate);
          }
        }
      });
    }
    return acc;
  }, new Map<string, number>());
  const usedOtherName = countedCategories.has(OTHER_CATEGORY_NAME) ? ALT_OTHER_CATEGORY_NAME : OTHER_CATEGORY_NAME;

  const sortedEntries = [...countedCategories.entries()].sort((a, b) => b[1] - a[1]);
  if (sortedEntries.length <= namedItems) {
    return { shownCategories: sortedEntries, otherCategories: [], otherName: usedOtherName };
  }
  const shownCategories = sortedEntries.slice(0, namedItems);
  const otherCategories = sortedEntries.slice(namedItems);
  return { shownCategories, otherCategories, otherName: usedOtherName };
}

export function prepareFrequentItemsWithOtherData(
  timestamp: number,
  frequentItems: FrequentItemUnitFieldsFragment[] | undefined | null,
  shownCategories: string[],
  otherCategories: string[],
  otherName: string,
): StackedTimestampedBar {
  if (!frequentItems || frequentItems.length === 0) {
    return { timestamp, values: [], estimates: [] };
  }

  if (otherCategories.length === 0) {
    const filteredItems = frequentItems
      .filter((fi) => !!fi.value)
      .map((fi) => ({ value: fi.value!, estimate: fi.estimate ?? 0 }));
    return {
      timestamp,
      values: filteredItems.map((fi) => fi.value),
      estimates: filteredItems.map((fi) => fi.estimate),
    };
  }
  const otherCount = otherCategories.reduce((acc, curr) => {
    if (curr) {
      return acc + (frequentItems.find((fi) => fi.value === curr)?.estimate ?? 0);
    }
    return acc;
  }, 0);

  const visibleCategories = [...shownCategories];
  visibleCategories.unshift(otherName);

  const items = visibleCategories.map((category) => {
    const estimate =
      category === otherName ? otherCount : frequentItems.find((fi) => fi.value === category)?.estimate ?? 0;
    return { value: category, estimate };
  });
  return { timestamp, values: items.map((fi) => fi.value), estimates: items.map((fi) => fi.estimate) };
}

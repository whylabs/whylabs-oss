import { Card, GraphParams, InfoText, SubGrid } from 'generated/dashboard-schema';
import { BarGroup } from 'components/visualizations/linear-bar-graph/LinearBarGraph';
import { isExactlyNullOrUndefined } from 'utils';
import { Colors } from '@whylabs/observatory-lib';
import { DatedCurves } from 'components/visualizations/dated-curves-graph/utils';
import { DatedStackedBar, KeysAndColors } from 'components/visualizations/dated-bar-stack/utils';
import { getUTCStartOfDay } from 'utils/dateRangeUtils';
import { QueryValueSet } from '../query-handlers/types';
import { ToggleOnClickState } from '../helpers/cardReducers';

export type FieldValueType = { [key: string]: number };

export interface DashCardGraphProps {
  cardInfo: Card;
  graphType: Exclude<GraphParams['type'], undefined>;
  fieldValues:
    | {
        [key: string]: number;
      }
    | null
    | undefined;
  timeSeriesFieldValues?: QueryValueSet['timeSeriesFieldValues'];
  timeSeriesValues?: QueryValueSet['timeSeriesValues'];
  toggleOnClickState?: ToggleOnClickState;
  width: number;
}

export const LINEAR_GRAPH_WIDTH = 182;
export const DEFAULT_COLORS = Colors.alertBarArray;
export const TIME_SERIES_HEIGHT = 126;

export function makeBarData(fieldValues: FieldValueType, subGrid: SubGrid): BarGroup[] {
  const barGroups: BarGroup[] = [];

  subGrid?.contents?.forEach((miniCard, idx) => {
    const itemValue = fieldValues ? fieldValues[miniCard.fieldId ?? 'none'] : null;
    if (isExactlyNullOrUndefined(itemValue)) {
      return;
    }
    barGroups.push({
      name: miniCard.fieldId,
      count: itemValue,
      color: miniCard.config?.colorInfo?.color ?? DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
    });
  });

  return barGroups;
}

export const mapTimeseriesDataStartOfDay = <Type extends { timestamp: number }>(data: Type[]): Type[] => {
  return data.map((el) => {
    return {
      ...el,
      timestamp: getUTCStartOfDay(new Date(el.timestamp)).getTime(),
    };
  });
};

type TimeSeriesFieldValues = Exclude<QueryValueSet['timeSeriesFieldValues'], undefined>;
type ItemCount = DatedStackedBar['counts'][number];
export function mergeCounts(first: ItemCount, second?: ItemCount): ItemCount {
  return {
    id: first.id,
    count: first.count + (second?.count ?? 0),
    name: first.name,
    color: first.color,
  };
}

function addItemsToMap(mergedMap: Map<string, ItemCount>, items: ItemCount[]) {
  items.forEach((ic) => {
    const existing = mergedMap.get(ic.id);
    mergedMap.set(ic.id, mergeCounts(ic, existing));
  });
}

export function mergeCountArrays(first: ItemCount[], second: ItemCount[]): ItemCount[] {
  const mergedMap: Map<string, ItemCount> = new Map();
  addItemsToMap(mergedMap, [...first, ...second]);
  const mergedArray = [...mergedMap.values()].sort((a, b) => {
    if (a.id < b.id) {
      return -1;
    }
    if (a.id > b.id) {
      return 1;
    }
    return 0;
  });
  return mergedArray;
}

export function makeDatedStackedBars(
  timeSeriesFieldValues: TimeSeriesFieldValues,
  subGrid: SubGrid,
  keyInfo: KeysAndColors,
): DatedStackedBar[] {
  const dailyData = new Map<number, DatedStackedBar>();
  const data = mapTimeseriesDataStartOfDay<TimeSeriesFieldValues[number]>(timeSeriesFieldValues);
  data?.forEach(({ values, timestamp }) => {
    if (values === null) return;
    const counts: DatedStackedBar['counts'] = [];
    const remainingKeys: Set<string> = new Set(keyInfo.keys);
    Object.keys(values).forEach((value) => {
      const miniCard = subGrid.contents.find((cont) => cont.fieldId === value);
      const colorValue = miniCard?.config?.colorInfo?.color;
      const name = miniCard?.title.text;
      if (colorValue && name) {
        counts.push({ id: value, color: colorValue, count: values[value], name });
        remainingKeys.delete(value);
      }
    });
    Array.from(remainingKeys).forEach((key) => {
      const infoIndex = keyInfo.keys.indexOf(key);
      if (infoIndex > -1 && infoIndex < keyInfo.names.length && infoIndex < keyInfo.colors.length) {
        counts.push({ id: key, color: keyInfo.colors[infoIndex], count: 0, name: keyInfo.names[infoIndex] });
      }
    });
    const existent = dailyData.get(timestamp);
    const datedBar = { timestamp, counts: mergeCountArrays(existent?.counts ?? [], counts) };
    dailyData.set(timestamp, datedBar);
  });
  return [...dailyData.values()];
}

type TimeSeriesValues = Exclude<QueryValueSet['timeSeriesValues'], undefined>;
export const makeDatedCurves = (timeSeriesValues: TimeSeriesValues, chartTitle: InfoText): DatedCurves[] => {
  const defaultTsProps = { color: Colors.purple, label: chartTitle.tooltip ?? chartTitle.text };
  const data = mapTimeseriesDataStartOfDay<TimeSeriesValues[number]>(timeSeriesValues);
  const dailyData = new Map<number, DatedCurves>();
  data.forEach(({ timestamp, value }) => {
    const existent = dailyData.get(timestamp);
    const nullValues = typeof value !== 'number' && typeof existent?.value !== 'number';
    const newTs = { ...defaultTsProps, timestamp, value: nullValues ? null : (value ?? 0) + (existent?.value ?? 0) };
    dailyData.set(timestamp, newTs);
  });
  return [...dailyData.values()];
};

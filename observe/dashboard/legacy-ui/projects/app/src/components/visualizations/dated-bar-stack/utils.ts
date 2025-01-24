import { AnomalyTooltipProps, TooltipItem } from 'components/controls/table/AnomalyTooltip';
import { TimeSeriesValue } from 'pages/resource-overview-page/dashboards/executive-dashboard/query-handlers/types';

interface ItemCount {
  id: string;
  count: number;
  color: string;
  name: string;
}
export interface DatedStackedBar extends TimeSeriesValue {
  timestamp: number;
  counts: ItemCount[];
}

export function getTotalCount(datum: DatedStackedBar): number {
  return datum.counts.reduce((acc, curr) => {
    return curr.count + acc;
  }, 0);
}
export function findMaxTotalCount(data: DatedStackedBar[]): number {
  return Math.max(...data.map(getTotalCount));
}

export type KeysAndColors = { keys: string[]; colors: string[]; names: string[] };

export function getKeysAndColors(data: DatedStackedBar[]): KeysAndColors {
  const output: KeysAndColors = { keys: [], colors: [], names: [] };
  const foundKeys = new Set<string>();
  data.forEach((datum) => {
    datum.counts.forEach((c) => {
      if (foundKeys.has(c.id)) {
        return;
      }
      foundKeys.add(c.id);
      output.keys.push(c.id);
      output.colors.push(c.color);
      output.names.push(c.name);
    });
  });
  return output;
}

export const translateDatedStackedTooltipData = (
  timestamp: number,
  dataAtIndex?: DatedStackedBar,
): AnomalyTooltipProps => {
  const items: TooltipItem[] = [];
  if (dataAtIndex) {
    items.push(
      ...dataAtIndex.counts
        .map((c) => ({
          color: c.color,
          count: c.count,
          label: c.name,
        }))
        .sort((a, b) => {
          if (a.label < b.label) {
            return -1;
          }
          if (a.label > b.label) {
            return 1;
          }
          return 0;
        }),
    );
  }
  return { items, timestamp };
};

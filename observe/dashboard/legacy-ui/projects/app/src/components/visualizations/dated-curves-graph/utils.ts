import { TimeSeriesValue } from 'pages/resource-overview-page/dashboards/executive-dashboard/query-handlers/types';
import { AnomalyTooltipProps, TooltipItem } from 'components/controls/table/AnomalyTooltip';

export interface DatedCurves extends TimeSeriesValue {
  color: string;
  label: string;
}

export const translateDatedCurvesTooltipData = (timestamp: number, dataAtIndex?: DatedCurves): AnomalyTooltipProps => {
  const items: TooltipItem[] = [];
  if (dataAtIndex) {
    items.push({ color: dataAtIndex.color, count: dataAtIndex.value ?? 0, label: dataAtIndex.label });
  }
  return {
    items,
    timestamp,
  };
};

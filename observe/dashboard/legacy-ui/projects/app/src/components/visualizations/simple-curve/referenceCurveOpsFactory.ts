import { DashStyleValue, SeriesOptionsType } from 'hcplaceholder';
import { Colors } from '@whylabs/observatory-lib';

type ReferenceCurveType = 'horizontal-middle' | 'diagonal' | 'vertical-middle';
type ReferenceCurveLayer = 'top' | 'bottom';
type ChartTooltipType = 'default' | 'score-bucket';
export type ReferenceCurveOptions = {
  type: ReferenceCurveType;
  layer: ReferenceCurveLayer;
  style: DashStyleValue | undefined;
  dataLengthOverride?: number;
};

export function generateReferenceCurveOptions(referenceCurveOptions?: ReferenceCurveOptions): SeriesOptionsType | null {
  if (!referenceCurveOptions) {
    return null;
  }
  const data: [number, number][] = [];
  switch (referenceCurveOptions.type) {
    case 'diagonal':
      data.push([0, 0], [1, 1]);
      break;
    case 'horizontal-middle':
      data.push([0, 0.5], [1, 0.5]);
      break;
    case 'vertical-middle':
      data.push([0.5, 0], [0.5, 1]);
      break;
  }
  return {
    type: 'line',
    name: 'Reference curve',
    data,
    marker: {
      enabled: false,
      states: {
        hover: {
          enabled: false,
        },
      },
    },
    color: Colors.secondaryLight700,
    enableMouseTracking: false,
    dashStyle: referenceCurveOptions?.style,
    showInLegend: false,
  };
}

/* eslint-disable func-names */
export function generateTooltipFormatter(
  seriesData: number[][],
  tooltipType: ChartTooltipType,
  xAxisLabel: string,
  yAxisLabel: string,
  dataLengthOverride?: number,
): HCPlaceholder.TooltipFormatterCallbackFunction {
  if (tooltipType === 'default' || !seriesData.length) {
    return function () {
      const { x, y } = this.point;
      return `${xAxisLabel}: ${x}<br>${yAxisLabel}: ${y}`;
    };
  }
  const totalBuckets = (dataLengthOverride ?? 0) > 0 ? dataLengthOverride! : seriesData.length;
  const bucketSize = 1 / totalBuckets;
  return function () {
    const { x, y } = this.point;
    return `${(x - bucketSize / 2).toFixed(2)} < ${xAxisLabel} &le; ${(x + bucketSize / 2).toFixed(
      2,
    )}<br>${yAxisLabel}: ${y?.toFixed(4)}`;
  };
}

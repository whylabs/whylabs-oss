import { Colors } from '@whylabs/observatory-lib';
import { SeriesColumnOptions } from 'hcplaceholder';
import { HistogramDomain } from 'components/visualizations/inline-histogram/histogramUtils';
import { isExactlyNullOrUndefined } from 'utils';
import { friendlyFormat } from 'utils/numberUtils';
import { UnifiedHistogramWithMetadata } from './types';
import { HCPlaceholderWrapper } from '../HCPlaceholderWrapper';

interface OverlaidHistogramsViewProps {
  graphHeight: number;
  graphWidth: number;
  allUnifiedBins: number[];
  graphVerticalBuffer: number;
  graphHorizontalBuffer: number;
  unifiedHistograms: UnifiedHistogramWithMetadata[];
  histogramDomain: HistogramDomain;
  histogramRange: HistogramDomain;
  viewXMin?: number;
  viewXMax?: number;
  compactView?: boolean;
}

/**
 * Removes last bin since the last bin is only used to determine where the last edge is.
 */
function prepareBinsForRender(bins: number[], min?: number, max?: number) {
  const sliced = bins.slice(0, bins.length - 1);
  return sliced.map((bin) => friendlyFormat(bin, 2));
}

function filterBinsForRender(bins: number[], min?: number, max?: number) {
  const filtered = bins.filter(
    (bin) => (min ?? Number.NEGATIVE_INFINITY) <= bin && bin <= (max ?? Number.POSITIVE_INFINITY),
  );
  return filtered;
}

type PointDataType = {
  y: number;
  custom: {
    min: number | null;
    max: number | null;
  };
};

function createFormattedData(histogram: UnifiedHistogramWithMetadata, bins: number[]): PointDataType[] | undefined {
  return histogram.data?.counts.map((count, i) => {
    const min = i < bins.length ? bins[i] : null;
    const max = i + 1 < bins.length ? bins[i + 1] : null;
    return {
      y: count,
      custom: {
        min,
        max,
      },
    };
  });
}

function filterScopedOutData(
  data: PointDataType[] | undefined,
  min: number | undefined,
  max: number | undefined,
): PointDataType[] | undefined {
  if (!data) {
    return undefined;
  }
  return data.filter((point) => {
    return (
      !isExactlyNullOrUndefined(point.custom.min) &&
      !isExactlyNullOrUndefined(point.custom.max) &&
      (min ?? Number.NEGATIVE_INFINITY) <= point.custom.min &&
      (max ?? Number.POSITIVE_INFINITY) >= point.custom.max
    );
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isPointDataType(data: any): data is PointDataType {
  return 'y' in data && 'custom' in data;
}

function tooltipFormatter(this: HCPlaceholder.TooltipFormatterContextObject): false | string {
  if (!this.points || this.points.length === 0) {
    return false;
  }
  let start = `Bin <b>${this.x}</b>`;
  const pt = this.points[0].point;
  if (isPointDataType(pt)) {
    start = `<b>Bin edges: ${friendlyFormat(pt.custom.min, 2, { missingValueDisplay: '-' })} to ${friendlyFormat(
      pt.custom.max,
      2,
      { missingValueDisplay: '-' },
    )}</b>`;
  }
  return this.points.reduce((s, point) => {
    return `${s}<br/><span style="color:${point.series.color}">\u25CF</span> ${point.series.name}: ${point.y}`;
  }, start);
}

export function OverlaidHistogramHighchart({
  allUnifiedBins,
  graphHeight,
  graphWidth,
  unifiedHistograms,
  viewXMin,
  viewXMax,
}: OverlaidHistogramsViewProps): JSX.Element {
  const filtered = filterBinsForRender(allUnifiedBins, viewXMin, viewXMax);
  const renderBins = prepareBinsForRender(filtered, viewXMin, viewXMax);

  const binMin = filtered.length > 0 ? filtered[0] : 0;
  const binMax = filtered.length > 0 ? filtered[filtered.length - 1] : 1;
  const viewedMin = viewXMin ?? binMin;
  const viewedMax = viewXMax ?? binMax;
  const series: SeriesColumnOptions[] = unifiedHistograms.map((histogram) => {
    const formattedData = createFormattedData(histogram, allUnifiedBins);
    const filteredData = filterScopedOutData(formattedData, viewXMin, viewXMax);
    return {
      name: histogram.profileName || `Profile ${histogram.profileNum}`,
      data: filteredData ?? [],
      color: histogram.color,
      pointPadding: 0,
      type: 'column',
      xAxis: 0,
      opacity: 1,
    };
  });
  const options: HCPlaceholder.Options = {
    chart: {
      type: 'column',
      height: graphHeight,
      width: graphWidth,
      spacingTop: 16,
      spacingBottom: 4,
      spacingRight: 36, // needed to make things line up nicely
      plotBorderWidth: 1,
      plotBorderColor: Colors.transparent,
      style: {
        fontFamily: 'Asap',
      },
    },
    tooltip: {
      shared: true,
      formatter: tooltipFormatter,
    },
    title: {
      text: undefined, // no title to be shown
    },
    xAxis: [
      {
        lineWidth: 1,
        categories: renderBins,
        crosshair: true,
        visible: false,
      },
      {
        lineColor: Colors.brandSecondary200,
        lineWidth: 1,
        tickColor: Colors.brandSecondary200,
        tickWidth: 1,
        labels: {
          allowOverlap: false,
          autoRotation: undefined,
        },
        min: viewedMin,
        max: viewedMax,
      },
    ],
    yAxis: {
      title: { text: 'Count' },
    },
    plotOptions: {
      column: {
        pointPadding: 0,
        groupPadding: 0,
        borderWidth: 1,
        borderRadius: 0,
        opacity: 1,
        grouping: false,
        shadow: false,
        boostBlending: 'multiply',
      },
    },
    series,
  };

  return <HCPlaceholderWrapper isLoading={false} options={options} />;
}

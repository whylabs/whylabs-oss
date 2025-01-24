import { SeriesBoxplotOptions } from 'hcplaceholder';
import { Colors } from '@whylabs/observatory-lib';

import { HistogramDomain } from 'components/visualizations/inline-histogram/histogramUtils';

import { friendlyFormat } from 'utils/numberUtils';
import { BoxPlotData } from './types';
import { HCPlaceholderWrapper } from '../HCPlaceholderWrapper';

interface FeaturePanelHCPlaceholderBoxPlotProps {
  graphHeight: number;
  graphWidth: number;
  boxPlotData: BoxPlotData[];
  domain: HistogramDomain | null;
}

function prepareBoxPlotSeries(boxPlotData: BoxPlotData[]): SeriesBoxplotOptions {
  return {
    type: 'boxplot',
    data: [
      ...boxPlotData.map((data) => {
        return {
          low: data.min,
          q1: data.firstQuartile,
          median: data.median,
          q3: data.thirdQuartile,
          high: data.max,
          name: data.category,
          color: data.stroke,
        };
      }),
    ],
  };
}

function renderTdAlignRight(value: number | undefined): string {
  return `<td style="text-align: right">${friendlyFormat(value, 3)}</td>`;
}

function renderRow(label: string, value: number | undefined): string {
  return `<tr style="font-size: 1.1em"><td>${label}:</td>${renderTdAlignRight(value)}</tr>`;
}

function renderHeader(category: string | number): string {
  return `<tr style="font-size: 1.2em"><th colspan="2"><b>${category}</b></th></tr>`;
}

function tooltipFormatter(this: HCPlaceholder.TooltipFormatterContextObject): false | string {
  if (!this.point || !this.point.options) {
    return false;
  }

  const { low, q1, median, q3, high } = this.point.options;
  const { category } = this.point;

  const table =
    `<table>` +
    `${renderHeader(category)}` +
    `${renderRow('Min', low)}` +
    `${renderRow('Q1', q1)}` +
    `${renderRow('Median', median)}` +
    `${renderRow('Q3', q3)}` +
    `${renderRow('Max', high)}` +
    `</table>`;
  return table;
}

export function FeaturePanelHCPlaceholderBoxPlot({
  graphHeight,
  graphWidth,
  boxPlotData,
  domain,
}: FeaturePanelHCPlaceholderBoxPlotProps): JSX.Element {
  const categories = boxPlotData.map((data) => data.category);
  const series = [prepareBoxPlotSeries(boxPlotData)];
  const options: HCPlaceholder.Options = {
    chart: {
      type: 'boxplot',
      height: graphHeight,
      width: graphWidth,
      inverted: true,
      spacingTop: 16,
      spacingBottom: 4,
      spacingRight: 36, // needed to make things line up nicely
      plotBorderWidth: 1,
      plotBorderColor: Colors.transparent,
      style: {
        fontFamily: 'Asap',
      },
    },
    legend: {
      enabled: false,
    },
    tooltip: {
      useHTML: true,
      followPointer: true,
      formatter: tooltipFormatter,
    },
    title: {
      text: undefined, // no title to be shown
    },
    xAxis: [
      {
        categories,
        lineColor: Colors.transparent,
        lineWidth: undefined,
        tickColor: Colors.transparent,
        tickWidth: undefined,
        labels: {
          allowOverlap: false,
          autoRotation: undefined,
          rotation: 270,
        },
      },
    ],
    yAxis: {
      lineWidth: 1,
      tickWidth: 1,
      lineColor: Colors.brandSecondary200,
      tickColor: Colors.brandSecondary200,
      gridLineWidth: undefined,
      min: domain?.isValid ? domain.min : undefined,
      max: domain?.isValid ? domain.max : undefined,
      title: { text: 'Count' },
    },
    plotOptions: {
      boxplot: {
        pointPadding: 0.1,
        groupPadding: 0.1,
        opacity: 1,
        grouping: true,
        shadow: false,
      },
    },
    series,
  };
  return <HCPlaceholderWrapper isLoading={false} options={options} />;
}

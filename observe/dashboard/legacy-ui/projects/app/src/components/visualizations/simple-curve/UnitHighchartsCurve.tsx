import { Colors } from '@whylabs/observatory-lib';
import { SeriesOptionsType } from 'hcplaceholder';
import { HCPlaceholderWrapper } from '../HCPlaceholderWrapper';

interface UnitHCPlaceholderCurveProps {
  isLoading: boolean;
  xAxisTitle: string;
  yAxisTitle: string;
  series: SeriesOptionsType[];
  tooltipFormatter?: HCPlaceholder.TooltipFormatterCallbackFunction;
}

/* eslint-disable no-useless-concat */
export function UnitHCPlaceholderCurve({
  xAxisTitle,
  yAxisTitle,
  isLoading,
  series,
  tooltipFormatter,
}: UnitHCPlaceholderCurveProps): JSX.Element {
  const options: HCPlaceholder.Options = {
    chart: {
      type: 'line',
      spacingTop: 10,
      spacingBottom: 10,
      plotBorderWidth: 1,
      plotBorderColor: Colors.brandSecondary200,
      style: {
        fontFamily: 'Asap',
      },
    },
    xAxis: {
      lineColor: Colors.brandSecondary200,
      lineWidth: 1,
      tickColor: Colors.brandSecondary200,
      title: {
        text: xAxisTitle,
        style: {
          fontSize: '14px',
          fontWeight: '600',
        },
      },
      min: 0,
      max: 1,
    },
    title: {
      text: '',
      style: {
        fontSize: '1em',
      },
    },
    legend: {
      enabled: false,
    },
    yAxis: {
      lineColor: Colors.brandSecondary200,
      lineWidth: 1,
      gridLineWidth: 0,
      tickColor: Colors.brandSecondary200,
      tickWidth: 1,
      title: {
        text: yAxisTitle,
        style: {
          fontSize: '14px',
          fontWeight: '600',
        },
      },
      min: 0,
      max: 1,
    },
    tooltip: {
      formatter: tooltipFormatter,
    },
    series,
  };

  return <HCPlaceholderWrapper isLoading={isLoading} options={options} />;
}

import { Colors } from '@whylabs/observatory-lib';
import { SeriesOptionsType } from 'hcplaceholder';
import { HCPlaceholderHeatMapWrapper } from '../HCPlaceholderHeatMapWrapper';

interface HCPlaceholderHeatMapProps {
  isLoading: boolean;
  labels: string[];
  xAxisTitle: string;
  yAxisTitle: string;
  series: SeriesOptionsType[];
}

/* eslint-disable no-useless-concat */
export function HCPlaceholderHeatMap({
  isLoading,
  labels,
  xAxisTitle,
  yAxisTitle,
  series,
}: HCPlaceholderHeatMapProps): JSX.Element {
  const options: HCPlaceholder.Options = {
    chart: {
      type: 'heatmap',
      marginTop: 60,
      marginBottom: 80,
      plotBorderWidth: 1,
      plotBorderColor: Colors.brandSecondary200,
      style: {
        fontFamily: 'Asap',
      },
    },
    title: {
      text: '',
      style: {
        fontSize: '1em',
      },
    },
    accessibility: {
      point: {
        descriptionFormat:
          '{(add index 1)}. ' + '{series.xAxis.categories.(x)} predicted ' + '{series.yAxis.categories.(y)}, {value}.',
      },
    },
    xAxis: {
      categories: labels,
      lineColor: Colors.brandSecondary200,
      lineWidth: 0,
      labels: {
        style: {
          fontSize: '12px',
        },
      },
      title: {
        text: xAxisTitle,
        style: {
          fontSize: '14px',
          fontWeight: '600',
        },
      },
      opposite: true,
    },
    yAxis: {
      categories: labels,
      reversed: true,
      labels: {
        style: {
          fontSize: '12px',
        },
      },
      title: {
        text: yAxisTitle,
        style: {
          fontSize: '14px',
          fontWeight: '600',
        },
      },
    },
    colorAxis: {
      min: 0,
      minColor: '#FFFFFF',
      maxColor: Colors.chartPrimary,
    },
    series,
    legend: {
      align: 'right',
      layout: 'vertical',
      margin: 20,
      verticalAlign: 'top',
      y: 40,
      symbolHeight: 280,
    },
    tooltip: {
      format:
        '{series.yAxis.categories.(point.x:,.0f)} predicted ' +
        '{series.xAxis.categories.(point.y:,.0f)}' +
        ': ' +
        '<b>{point.value:,.0f}</b>',
    },
    responsive: {
      rules: [
        {
          condition: {
            maxWidth: 500,
          },
          chartOptions: {
            yAxis: {
              labels: {
                format: '{substr value 0 1}',
              },
            },
          },
        },
      ],
    },
  };

  return <HCPlaceholderHeatMapWrapper isLoading={isLoading} options={options} />;
}

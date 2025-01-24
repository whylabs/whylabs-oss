import { Colors } from '~/assets/Colors';
import { arrayOfLength } from '~/utils/arrayUtils';
import { displayNumber, isValidNumber } from '~/utils/numberUtils';
import HCPlaceholder from 'hcplaceholder';

import { getChartCommonOptions } from './chart-utils';
import { HCPlaceholderWrapper } from './HCPlaceholderWrapper';
import { CommonChartProps } from './types/chart-types';

type PieSeriesItem = {
  color?: string;
  name: string;
  value: number | null;
};

export type PieSeries = {
  color?: string;
  data: Array<PieSeriesItem>;
  id?: string;
  subtitle?: string;
  title?: string;
};

export type PieChartProps = Omit<CommonChartProps, 'spec'> & PieSeries;

export const PieChart = ({ color, data, height, margin, subtitle, title, ...rest }: PieChartProps) => {
  const commonOptions = getChartCommonOptions({ height });

  // Generate monochromatic colors using hcplaceholder color API
  const colors = arrayOfLength(6).map((_, i) =>
    HCPlaceholder.color(color ?? Colors.chartBlue)
      .brighten((i - 2) / 10)
      .get(),
  );

  let hasAnyValue = false;

  // HCPlaceholder mutates the data, so we'll pass a copy to it instead
  // https://github.com/hcplaceholder/hcplaceholder-react#why-hcplaceholder-mutates-my-data
  const seriesData = data.slice().map(({ value, ...dataRest }) => {
    if (value) hasAnyValue = true;

    return {
      ...dataRest,
      y: value,
    };
  });

  const options: HCPlaceholder.Options = {
    ...commonOptions,
    chart: {
      ...commonOptions.chart,
      margin,
      plotShadow: false,
      type: 'pie',
    },
    legend: {
      enabled: false,
    },
    plotOptions: {
      pie: {
        allowPointSelect: true,
        colors,
        cursor: 'pointer',
        dataLabels: {
          enabled: false,
        },
        showInLegend: true,
      },
      series: {
        allowPointSelect: true,
        cursor: 'pointer',
        dataLabels: [
          {
            enabled: true,
            // @ts-expect-error - It is a valid option, copy-paste from https://jsfiddle.net/api/post/library/pure/
            distance: 20,
          },
          {
            enabled: true,
            // @ts-expect-error - It is a valid option, copy-paste from https://jsfiddle.net/api/post/library/pure/
            distance: -40,
            format: '{point.percentage:.1f}%',
            style: {
              fontSize: '1.0em',
              opacity: 0.9,
            },
            filter: {
              operator: '>=',
              property: 'percentage',
              value: 10,
            },
          },
        ],
      },
    },
    series: [
      {
        // The chart renders in a strange way if there are no values, so we'll just pass an empty array in that case
        data: hasAnyValue ? seriesData : [],
        type: 'pie',
      },
    ],
    title: {
      ...commonOptions.title,
      text: title,
    },
    subtitle: {
      ...commonOptions.subtitle,
      text: subtitle,
    },
    tooltip: {
      headerFormat: '',
      pointFormatter(this) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const point = this;

        // Shouldn't happen, but just in case
        if (!isValidNumber(point.percentage)) return point.name;

        // This function expects a string to be returned, but we can use HTML tags to format the tooltip
        return `${point.name}: <b>${point.percentage.toFixed(1)}%</b><br/>Total: <b>${displayNumber(point.y)}</b>`;
      },
    },
  };

  return <HCPlaceholderWrapper {...rest} options={options} />;
};

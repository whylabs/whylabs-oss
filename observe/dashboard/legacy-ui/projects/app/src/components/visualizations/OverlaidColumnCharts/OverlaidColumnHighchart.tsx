import { Colors } from '@whylabs/observatory-lib';
import { SeriesColumnOptions } from 'hcplaceholder';
import { HCPlaceholderWrapper } from '../HCPlaceholderWrapper';

export type ColoredCategoryData = {
  name: string;
  color: string;
  data: Map<string, number | null>;
};

interface OverlaidColumnHighchartProps {
  graphHeight: number;
  graphWidth: number;
  categories: string[];
  graphVerticalBuffer: number;
  graphHorizontalBuffer: number;
  categoryCounts: ColoredCategoryData[];
  compactView?: boolean;
}

export function OverlaidColumnHighchart({
  graphHeight,
  graphWidth,
  categories,
  categoryCounts,
}: OverlaidColumnHighchartProps): JSX.Element {
  const series: SeriesColumnOptions[] = categoryCounts.map((category) => {
    const data = categories.map((categoryName) => {
      return category.data.get(categoryName) ?? 0;
    });
    return {
      name: category.name,
      data,
      color: category.color,
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
    },
    title: {
      text: undefined, // no title to be shown
    },
    xAxis: {
      lineWidth: 1,
      categories,
      crosshair: true,
      visible: false,
    },
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

import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import { WhyLabsText } from '~/components/design-system';
import { SeriesOptionsType } from 'hcplaceholder';

import { generateSeriesToRender, getChartCommonOptions } from './chart-utils';
import { HCPlaceholderWrapper } from './HCPlaceholderWrapper';
import { ChartCategorySeries, CommonChartProps } from './types/chart-types';

export type CategoricalChartProps = CommonChartProps & {
  series: ChartCategorySeries[];
  categories: string[];
};

const useStyles = createStyles({
  noDataCard: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDataText: {
    fontFamily: 'Asap',
    fontSize: '16px',
    color: Colors.secondaryLight900,
    fontWeight: 500,
  },
});

export const CategoricalChart = ({ series, categories, spec, ...rest }: CategoricalChartProps) => {
  const commonOptions = getChartCommonOptions({ spec, ...rest });
  const { classes } = useStyles();
  const seriesToRender: SeriesOptionsType[] = generateSeriesToRender(series, spec);

  const options: HCPlaceholder.Options = {
    ...commonOptions,
    xAxis: {
      ...commonOptions.xAxis,
      type: 'category',
      categories,
    },
    // HCPlaceholder mutates the data, so we'll pass a copy to it instead
    // https://github.com/hcplaceholder/hcplaceholder-react#why-hcplaceholder-mutates-my-data
    series: seriesToRender.slice(),
  };

  if (!rest.isLoading && series.every((s) => !s.data.length))
    return (
      <div className={classes.noDataCard}>
        <WhyLabsText className={classes.noDataText}>Insufficient data available for time period.</WhyLabsText>
      </div>
    );

  return <HCPlaceholderWrapper {...rest} options={options} />;
};

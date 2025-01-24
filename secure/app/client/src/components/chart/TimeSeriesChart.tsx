import { createStyles } from '@mantine/core';
import { SeriesOptionsType } from 'hcplaceholder';
import { Colors } from '~/assets/Colors';
import { WhyLabsText } from '~/components/design-system';

import { generateSeriesToRender, getChartCommonOptions } from './chart-utils';
import { HCPlaceholderWrapper } from './HCPlaceholderWrapper';
import { ChartTimeSeries, CommonChartProps } from './types/chart-types';

export type TimeSeriesChartProps = CommonChartProps & {
  series: ChartTimeSeries[];
  customEmptyStateText?: string;
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

export const TimeSeriesChart = ({ series, spec, customEmptyStateText, ...rest }: TimeSeriesChartProps) => {
  const commonOptions = getChartCommonOptions({ spec, ...rest });
  const { classes } = useStyles();
  const seriesToRender: SeriesOptionsType[] = generateSeriesToRender(series, spec);

  const options: HCPlaceholder.Options = {
    ...commonOptions,
    // HCPlaceholder mutates the data, so we'll pass a copy to it instead
    // https://github.com/hcplaceholder/hcplaceholder-react#why-hcplaceholder-mutates-my-data
    series: seriesToRender.slice(),
  };

  if (!rest.isLoading && !series?.some((plot) => plot.data.length))
    return (
      <div className={classes.noDataCard}>
        <WhyLabsText className={classes.noDataText}>
          {customEmptyStateText || 'Insufficient data available for time period.'}
        </WhyLabsText>
      </div>
    );

  return <HCPlaceholderWrapper {...rest} options={options} />;
};

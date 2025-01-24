import { createStyles } from '@mantine/core';

import { ChartExtraLegend, ChartExtraLegendProps } from './ChartExtraLegend';

const useStyles = createStyles(() => ({
  root: {
    display: 'flex',
    flexDirection: 'row',
    gap: 20,
  },
}));

type LegendProps = Omit<ChartExtraLegendProps, 'chartId'>;

type ChartCardExtraLegendsProps = {
  chartId: string;
  isLoading?: boolean;
  legends: LegendProps[];
};

export const ChartCardExtraLegends = ({ legends, ...rest }: ChartCardExtraLegendsProps) => {
  const { classes } = useStyles();
  return (
    <div className={classes.root} data-testid="ChartCardExtraLegends">
      {legends.map((legendProps) => (
        <ChartExtraLegend key={legendProps.name} {...rest} {...legendProps} />
      ))}
    </div>
  );
};

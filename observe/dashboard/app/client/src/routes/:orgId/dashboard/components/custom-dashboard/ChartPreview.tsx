import { createStyles } from '@mantine/core';
import { VizDashboard } from '~/components/chart/VizDashboard';

import { ChartBuilderObject } from './types';
import { convertChartBuilderObjectToChartUnion } from './utils';

const useStyles = createStyles(() => ({
  root: {
    minHeight: 340,
    position: 'relative',
  },
}));

type ChartPreviewProps = {
  chart: ChartBuilderObject;
  id?: string;
};

export const ChartPreview = ({ chart, id }: ChartPreviewProps) => {
  const { classes } = useStyles();

  return (
    <div className={classes.root}>
      <VizDashboard chart={convertChartBuilderObjectToChartUnion(chart)} id={id ?? 'chart-creation-preview'} />
    </div>
  );
};

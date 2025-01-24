import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';

import { WhyLabsTypography } from '../design-system';

const useNoDataChartStyles = createStyles(() => ({
  noDataChartWrap: {
    display: 'flex',
    flex: 1,
    padding: 16,
    paddingLeft: 0,
    width: '100%',
  },
  noDataChart: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  noDataChartText: {
    color: Colors.brandSecondary900,
    fontWeight: 'bold',
    fontSize: 16,
  },
}));

type NoDataChartProps = {
  noDataMessage: string | React.ReactNode;
};

export const NoDataChart = ({ noDataMessage }: NoDataChartProps): JSX.Element => {
  const { classes } = useNoDataChartStyles();
  return (
    <div className={classes.noDataChartWrap}>
      <div className={classes.noDataChart}>
        <WhyLabsTypography className={classes.noDataChartText}>{noDataMessage}</WhyLabsTypography>
      </div>
    </div>
  );
};

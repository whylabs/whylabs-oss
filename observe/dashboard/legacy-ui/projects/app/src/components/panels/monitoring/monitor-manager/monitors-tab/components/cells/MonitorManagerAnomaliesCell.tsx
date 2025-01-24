import { SparklineChart } from 'components/visualizations/sparkline-chart/SparklineChart';
import { utcFormat } from 'd3-time-format';
import { createStyles } from '@mantine/core';

export type AnomalyCellItem = {
  count: number;
  timestamp: number;
};
interface MonitorManagerAnomaliesCellProps {
  data: AnomalyCellItem[];
}

const useStyles = createStyles({
  sparkline: {
    padding: 10,
    display: 'flex',
    alignItems: 'center',
    height: '100%',
  },
});

export default function MonitorManagerAnomaliesCell({ data }: MonitorManagerAnomaliesCellProps): JSX.Element {
  const { classes: styles } = useStyles();
  const oneAnomalyFoundMessage =
    data.length === 1 && !!data[0].timestamp
      ? `One anomaly on ${utcFormat('%m-%d')(new Date(data[0].timestamp))}`
      : 'One anomaly in range';

  return (
    <SparklineChart
      className={styles.sparkline}
      hoveredRow={0}
      data={data}
      dataAccessor={(item) => item.count}
      labelingProp="timestamp"
      noDataMessage="No anomalies in range"
      notEnoughDataMessage={oneAnomalyFoundMessage}
    />
  );
}

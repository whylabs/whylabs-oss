import { createStyles } from '@mantine/core';
import { Colors } from '@whylabs/observatory-lib';
import { WhyLabsText } from 'components/design-system';

const useNoDataChartStyles = createStyles({
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
    fontFamily: 'Asap',
    fontWeight: 600,
    fontSize: 16,
  },
});

export default function NoDataChart({ noDataMessage }: { noDataMessage: string | React.ReactNode }): JSX.Element {
  const { classes: styles } = useNoDataChartStyles();
  return (
    <div className={styles.noDataChartWrap}>
      <div className={styles.noDataChart}>
        <WhyLabsText inherit className={styles.noDataChartText}>
          {noDataMessage}
        </WhyLabsText>
      </div>
    </div>
  );
}

import { Cell, CellProps } from 'fixed-data-table-2';
import { useCommonStyles } from 'hooks/useCommonStyles';
import { createStyles } from '@mantine/core';
import { DateBucket, timeShort } from 'utils/dateUtils';
import { RedAlertBall, Colors } from '@whylabs/observatory-lib';
import GreenHappyBall from 'components/controls/GreenHappyBall';
import { BarChart, Bar, Tooltip, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { AlertCategoryCounts, TimePeriod } from 'generated/graphql';
import useTypographyStyles from 'styles/Typography';
import { WhyLabsText } from 'components/design-system';

const GRAPH_WIDTH = 120;
const WIDER_GRAPH_WIDTH = 144;

const useStyles = createStyles({
  abbreviatedCell: {
    textOverflow: 'ellipsis',
    maxWidth: '19em',
    lineHeight: 1.5,
    paddingTop: '2px',
    paddingBottom: '2px',
  },
  iconContainer: {
    minWidth: '2em',
    flexGrow: 0,
    display: 'flex',
    justifyContent: 'center',
  },
  graphContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    width: GRAPH_WIDTH,
    height: 24,
    padding: 0,
    marginLeft: 10,
  },
  lonelyGraphContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    width: WIDER_GRAPH_WIDTH,
    height: 24,
    padding: 0,
    marginLeft: 10,
  },
  cellBody: {
    maxHeight: 40,
  },
  stuffContainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  lonelyStuffContainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  singleItemContainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  noColorText: {
    fontStyle: 'italic',
    color: Colors.brandSecondary700,
    paddingRight: 0,
    width: 160,
  },
  graphContainerCard: {
    width: '165px',
    height: 24,
    padding: 0,
  },
});

export interface SparkbarV3CellProps extends CellProps {
  dateBuckets: DateBucket[];
  alertV3Data: AlertCategoryCounts | null;
  isCell?: boolean;
  syncId?: string;
  hoveredRow?: number;
  showRedAlertBall?: boolean;
  batchFrequency?: TimePeriod;
}

const CHART_HEIGHT = 28;
const PLACHOLDERS_DECIMAL_MODIFIER = 0.000000707;
const MIN_Y_TOP = 3;
// TODO: Make this more generic
const SparkbarV3Cell: React.FC<SparkbarV3CellProps> = ({
  alertV3Data,
  dateBuckets,
  rowIndex,
  width,
  height,
  isCell = true,
  syncId = Math.random().toString(),
  hoveredRow,
  showRedAlertBall = false,
  batchFrequency,
}) => {
  const { classes: commonStyles } = useCommonStyles();
  const { classes: typography, cx } = useTypographyStyles();
  const { classes: styles } = useStyles();
  if (rowIndex === undefined) {
    return <Cell width={width} height={height} className={cx(commonStyles.cellFont, styles.cellBody)} />;
  }

  const data = dateBuckets.map((date) => ({ ...date, alertsCount: 0 }));
  if (alertV3Data && alertV3Data.timeseries)
    alertV3Data.timeseries.forEach((avData) => {
      data.find((d, di) => {
        if (d.from.getTime() <= avData.timestamp && d.to.getTime() > avData.timestamp) {
          data[di].alertsCount += avData.counts.reduce((acc, curr) => acc + curr.count, 0);
          return true;
        }
        return false;
      });
    });

  const totalAlerts = data.length > 0 ? data.reduce((acc, curr) => acc + curr.alertsCount, 0) : 0;

  const renderText = () => (
    <WhyLabsText inherit className={cx(styles.noColorText, typography.monoFont)}>
      No anomalies in range
    </WhyLabsText>
  );
  const renderTooltip = (zeroValuePlaceholder: number) => {
    return hoveredRow !== undefined && rowIndex !== undefined && hoveredRow !== rowIndex ? (
      <Tooltip content={<div />} />
    ) : (
      <Tooltip
        separator=""
        contentStyle={{
          backgroundColor: Colors.tooltipBackgroundRGBA,
          padding: '4px 5px',
          fontFamily: 'Asap, Roboto, sans-serif',
          border: 'none',
          borderRadius: 5,
        }}
        labelStyle={{
          fontWeight: 600,
          color: Colors.white,
          fontSize: 10,
          lineHeight: 1,
        }}
        labelFormatter={(timestamp) => timeShort(timestamp as number, batchFrequency)}
        itemStyle={{
          fontWeight: 600,
          padding: 0,
          color: Colors.white,
          fontSize: 12,
          lineHeight: 1,
        }}
        formatter={(value) => [value === zeroValuePlaceholder ? 0 : (value as number), '']}
        filterNull={false}
      />
    );
  };
  const renderSparkbars = () => {
    const maxValue = Math.max(...data.map((d) => d.alertsCount));
    const rangeMax = Math.max(maxValue, MIN_Y_TOP);

    // making sure placeholder has unique decimal value and is aprox. 4% heigh (insted of 0)
    const zeroValuePlaceholder = (maxValue / 100) * 4 + PLACHOLDERS_DECIMAL_MODIFIER;
    const mappedData = data.map((datum) => ({
      alertCount: datum.alertsCount === 0 ? zeroValuePlaceholder : datum.alertsCount,
      timestamp: datum.from.getTime(),
    }));

    return (
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <BarChart syncId={syncId} data={mappedData} margin={{ top: 0, left: 0, right: 0, bottom: 0 }}>
          {renderTooltip(zeroValuePlaceholder)}
          <XAxis dataKey="timestamp" hide />
          <YAxis type="number" hide domain={[0, rangeMax]} />
          <Bar dataKey="alertCount" fill={Colors.brandRed4} />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  function renderContent() {
    const hasAlerts = totalAlerts > 0;
    return showRedAlertBall ? (
      <div className={styles.stuffContainer}>
        <div className={isCell ? styles.graphContainer : styles.graphContainerCard}>
          {hasAlerts ? renderSparkbars() : renderText()}
        </div>
        <div className={styles.iconContainer}>
          {hasAlerts ? <RedAlertBall alerts={totalAlerts} inverted /> : <GreenHappyBall inverted />}
        </div>
      </div>
    ) : (
      <div className={hasAlerts ? styles.singleItemContainer : styles.lonelyStuffContainer}>
        <div className={isCell ? styles.lonelyGraphContainer : styles.graphContainerCard}>
          {hasAlerts ? renderSparkbars() : renderText()}
        </div>
      </div>
    );
  }
  return (
    <>
      {isCell ? (
        <Cell width={width} height={height} className={cx(commonStyles.cellFont, styles.cellBody)}>
          {renderContent()}
        </Cell>
      ) : (
        renderContent()
      )}
    </>
  );
};

export default SparkbarV3Cell;

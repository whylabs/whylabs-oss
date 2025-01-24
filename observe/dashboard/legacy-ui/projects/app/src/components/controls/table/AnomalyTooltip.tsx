import { createStyles } from '@mantine/core';
import { Colors } from '@whylabs/observatory-lib';
import { TimePeriod } from 'generated/graphql';
import { getTooltipTimeDisplay } from 'utils/timePeriodUtils';
import { renderLegendItem } from 'components/visualizations/vizutils/shapeUtils';
import { WhyLabsText } from 'components/design-system';

const useStyles = createStyles({
  root: {
    border: `1px solid ${Colors.secondaryLight1000}`,
    boxShadow: `0px 4px 4px rgba(0, 0, 0, 0.25)`,
    borderRadius: `4px`,
    background: Colors.white,
    padding: '12px 10px 10px 10px',
  },
  bottomText: {
    margin: '0 10px',
    color: Colors.brandPrimary700,
  },
  text: {
    fontFamily: 'Asap',
    fontSize: '12px',
    lineHeight: 1.5,
    color: Colors.brandSecondary900,
    fontWeight: 400,
  },
  dateText: {
    fontWeight: 600,
  },
  blockIndication: {
    width: '5px',
    height: '10px',
    marginRight: '6px',
  },
  container: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '5px',
  },
  blockWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  numberText: {
    fontWeight: 600,
    fontSize: '12px',
    color: Colors.brandSecondary900,
  },
  total: {
    marginTop: '7px',
    borderTop: `1px solid ${Colors.brandSecondary100}`,
  },
  totalContent: {
    marginTop: '5px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

export interface AnomalyTooltipProps {
  items: TooltipItem[];
  timestamp?: number;
  endTimestamp?: number;
  bottomText?: string;
  batchFrequency?: TimePeriod;
}

export interface TooltipItem {
  color: string;
  label: string;
  count: number;
}

export default function AnomalyTooltip({
  timestamp,
  endTimestamp,
  items,
  bottomText,
  batchFrequency,
}: AnomalyTooltipProps): JSX.Element {
  const { classes: styles, cx } = useStyles();
  const totalCount = items.reduce((acc, curr) => {
    return acc + curr.count;
  }, 0);

  return (
    <div className={styles.root}>
      {timestamp && (
        <WhyLabsText inherit className={cx(styles.text, styles.dateText)}>
          {getTooltipTimeDisplay(timestamp, endTimestamp, batchFrequency)}
        </WhyLabsText>
      )}

      {items.length ? (
        items.map((item) => {
          return (
            <div key={`${item.label}${item.color}`} className={styles.container}>
              <div className={styles.blockWrapper}>
                {renderLegendItem(item.color, '', undefined, 'box')}
                <WhyLabsText inherit className={styles.text}>
                  {item.label}:
                </WhyLabsText>
              </div>
              <WhyLabsText inherit className={styles.numberText}>
                {item.count}
              </WhyLabsText>
            </div>
          );
        })
      ) : (
        <WhyLabsText inherit className={styles.text} style={{ textAlign: 'center' }}>
          Data not available
        </WhyLabsText>
      )}

      {items.length >= 2 && (
        <div className={styles.total}>
          <div className={styles.totalContent}>
            <WhyLabsText inherit className={styles.text}>
              Total
            </WhyLabsText>
            <WhyLabsText inherit className={styles.numberText}>
              {totalCount}
            </WhyLabsText>
          </div>
        </div>
      )}
      {bottomText && (
        <WhyLabsText inherit className={cx(styles.text, styles.bottomText)}>
          {bottomText}
        </WhyLabsText>
      )}
    </div>
  );
}

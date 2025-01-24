import { rankDescending } from 'utils/numberUtils';
import { Tooltip } from '@material-ui/core';
import { createStyles } from '@mantine/core';
import { Colors } from '@whylabs/observatory-lib';
import useTypographyStyles from 'styles/Typography';
import { WhyLabsText } from 'components/design-system';
import AnomalyTooltip from '../table/AnomalyTooltip';

const useStyles = createStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    margin: '2px',
  },
  barContainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    width: '100px',
    minWidth: '100px',
  },
  textContainer: {
    width: '100%',
    minWidth: '120px',
    height: '14px',
    marginRight: '10px',
    minHeight: '14px',
    textAlign: 'right',
  },
  rowContainer: {
    display: 'flex',
    flexDirection: 'row',
    outline: 'none',
    '&:focus': {
      border: 0,
    },
  },
  bar: {
    margin: '1px',
    paddingLeft: '2px',
    height: '14px',
    maxHeight: '14px',
    fontSize: '12px',
    lineHeight: '14px',
  },
  iconSpace: {
    minHeight: '14px',
    maxHeight: '14px',
    minWidth: '12px',
    alignSelf: 'center',
    backgroundColor: Colors.transparent,
  },
  tooltip: {
    background: 'unset',
    color: 'unset',
    padding: 'unset',
  },
});

export interface BarStackWidgetProps {
  counts: number[];
  colors: string[];
  labels: string[];
  keepOrder?: boolean;
}

const MAX_BAR_WIDTH = 100;
const BarStackWidget: React.FC<BarStackWidgetProps> = ({ counts, colors, labels, keepOrder }) => {
  const { classes: styles } = useStyles();
  const { classes: typography } = useTypographyStyles();
  const countRanks = rankDescending(counts);
  const widthUnit = MAX_BAR_WIDTH / Math.max(...counts);
  const widthValues = counts.map((count) => count * widthUnit);
  const colorValues = countRanks.map((rnk) => colors[(rnk - 1) % colors.length]);

  const displayParams: [string, number, number, string][] = keepOrder
    ? counts.map((count, i) => [labels[i], count ? widthValues[i] : 0, counts[i], colors[i]])
    : widthValues.map((w, i) => [labels[i], counts[i] ? w : 0, counts[i], colorValues[i]]);

  let offset = 0;
  if (displayParams.length === 2) {
    displayParams.unshift(['', 0, 0, '']);
    displayParams.push(['', 0, 0, '']);
    offset = 1;
  }

  const makeKey = (params: [string, number, number, string], index: number) =>
    `bar-${params[0] || 'space'}-${params[1]}-${params[2] || 'space'}-${
      index - offset > 0 && index - offset < colors.length ? colors[index - offset] : `transparent-${index}`
    }`;

  const renderBar = (params: [string, number, number, string], index: number) => {
    // only apply colored bar style if the count is non-zero
    const barName = params[0];
    const barWidth = params[1];
    const barCount = params[2];
    const barColor = params[3];
    const barStyle: React.CSSProperties = barWidth
      ? {
          fontWeight: 'bolder',
          color: Colors.white,
          backgroundColor: barColor,
          width: barWidth,
          minWidth: barWidth,
        }
      : {};
    if (!barName && !barCount) return null;

    return (
      <Tooltip
        key={makeKey(params, index)}
        title={
          <div>
            <AnomalyTooltip
              items={[
                {
                  label: barName,
                  color: barColor,
                  count: barCount,
                },
              ]}
            />
          </div>
        }
        classes={{
          tooltip: styles.tooltip,
        }}
        placement="right"
      >
        <div className={styles.rowContainer}>
          <div className={styles.textContainer}>
            {barColor && (
              <WhyLabsText size={12} className={typography.textThin}>
                {barName}
              </WhyLabsText>
            )}
          </div>
          <div className={styles.barContainer}>{barColor && <div className={styles.bar} style={barStyle} />}</div>
        </div>
      </Tooltip>
    );
  };
  return <div className={styles.root}>{displayParams.map(renderBar)}</div>;
};

export default BarStackWidget;

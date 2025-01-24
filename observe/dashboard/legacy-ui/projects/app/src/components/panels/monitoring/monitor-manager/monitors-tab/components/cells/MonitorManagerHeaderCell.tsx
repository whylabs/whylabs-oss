import { createStyles } from '@mantine/core';
import useCommonCellStyles from './CommonStyles';

const useStyles = createStyles({
  root: {
    display: 'flex',
    height: '100%',
    width: '100%',
  },
  cellText: {
    margin: 'auto 0',
  },
  headerText: {
    fontFamily: 'Asap',
    fontWeight: 'normal',
    fontSize: '13px',
    lineGeight: '15px',
  },
});

interface MonitorManagerHeaderCellProps {
  cellText: string;
  renderTooltip?: () => JSX.Element;
}

export default function MonitorManagerHeaderCell({
  cellText,
  renderTooltip,
}: MonitorManagerHeaderCellProps): JSX.Element {
  const { classes: styles, cx } = useStyles();
  const { classes: cellStyles } = useCommonCellStyles();

  return (
    <div className={cx(styles.root, styles.headerText, cellStyles.cellIndention)}>
      <span className={styles.cellText}>
        {cellText}
        {renderTooltip && renderTooltip()}
      </span>
    </div>
  );
}

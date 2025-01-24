import { Colors } from '@whylabs/observatory-lib';
import { SegmentCountDiscreteWidget } from 'components/controls/widgets/SegmentCountDiscreteWidget';
import { HeaderEmptyFillWidget } from 'components/controls/widgets/HeaderEmptyFillWidget';
import { createStyles } from '@mantine/core';

const useStyles = createStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    width: '100%',
    height: '100%',
  },
  widgetRow: {
    display: 'flex',
    flexDirection: 'row',
    borderLeft: `1px solid ${Colors.brandSecondary200}`,
    width: '100%',
    overflowX: 'auto',
    overflowY: 'hidden',
    height: '100%',
  },
});

interface SegmentHeaderPanelProps {
  readonly segmentsCounter: number | undefined;
}

export function SegmentHeaderPanel({ segmentsCounter }: SegmentHeaderPanelProps): JSX.Element {
  const { classes: styles } = useStyles();

  return (
    <div className={styles.root}>
      <div className={styles.widgetRow}>
        <SegmentCountDiscreteWidget segmentsCounter={segmentsCounter} />
        <HeaderEmptyFillWidget />
      </div>
    </div>
  );
}

import { FeatureCountDiscreteWidget } from 'components/controls/widgets';
import { HeaderEmptyFillWidget } from 'components/controls/widgets/HeaderEmptyFillWidget';
import { Colors, Spacings } from '@whylabs/observatory-lib';
import SegmentAlertCountWidget from 'components/controls/widgets/alert-count/SegmentAlertCountWidget';
import BatchFrequencyWidget from 'components/controls/widgets/BatchFrequencyWidget';
import ProfileLineageWidget from 'components/controls/widgets/ProfileLineageWidget';
import { createStyles } from '@mantine/core';

const useStyles = createStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    width: '100%',
    maxWidth: `calc(100% - ${Spacings.leftColumnWidth}px)`,
  },
  widgetRow: {
    display: 'flex',
    flexDirection: 'row',
    width: '100%',
    borderLeft: `1px solid ${Colors.brandSecondary200}`,
    overflowX: 'auto',
    overflowY: 'hidden',
  },
});

function SegmentedModelHeaderPanel(): JSX.Element {
  const { classes: styles } = useStyles();

  return (
    <div className={styles.root}>
      <div className={styles.widgetRow}>
        <FeatureCountDiscreteWidget withoutLeftBorder />
        <SegmentAlertCountWidget />
        <BatchFrequencyWidget />
        <ProfileLineageWidget />
        <HeaderEmptyFillWidget />
      </div>
    </div>
  );
}

export default SegmentedModelHeaderPanel;

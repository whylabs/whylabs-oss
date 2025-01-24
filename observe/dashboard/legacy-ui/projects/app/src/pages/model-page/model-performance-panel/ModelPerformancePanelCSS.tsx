import { createStyles } from '@mantine/core';
import { Colors } from '@whylabs/observatory-lib';

export const usePerformancePanelStyles = createStyles(() => ({
  headerNoPadding: {
    backgroundColor: Colors.white,
    display: 'flex',
    flexDirection: 'row',
    gap: '16px',
    padding: 0,
    overflowX: 'auto',
    flexShrink: 0,
    borderBottom: `1px solid ${Colors.brandSecondary200}`,
  },
  segmentSelectionContainer: {
    padding: '16px',
    minWidth: '350px',
  },
  root: {
    width: '100%',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
}));

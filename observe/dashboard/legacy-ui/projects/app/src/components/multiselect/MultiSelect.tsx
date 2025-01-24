import { Dispatch, SetStateAction } from 'react';
import { Colors } from '@whylabs/observatory-lib';
import { MultiSelectItem } from 'components/panels/monitoring/monitor-manager/custom-monitor/phase-cards/analysis/data-drift/SelectCard/useSelectCardData';
import { createStyles } from '@mantine/core';
import LeftSide from './LeftSide';
import RightSide from './RightSide';

const useStyles = createStyles({
  root: {
    background: Colors.white,
    borderRadius: '4px',
    width: '100%',
  },
  mainContainer: {
    border: `1px solid ${Colors.brandSecondary400}`,
    borderRadius: '4px',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
  },
  contentHeader: {
    display: 'flex',
    width: '100%',
    borderBottom: `1px solid ${Colors.brandSecondary400}`,
  },
});

interface MultiSelectProps<T> {
  onChange: Dispatch<SetStateAction<T[]>>;
  selectedItems: T[];
  items: T[];
  readonly?: boolean;
  showWeights?: boolean;
}

export default function MultiSelect<T extends MultiSelectItem>({
  onChange,
  selectedItems,
  items,
  readonly,
  showWeights,
}: MultiSelectProps<T>): JSX.Element {
  const { classes: styles, cx } = useStyles();

  return (
    <div className={cx(styles.root)}>
      <div className={styles.mainContainer}>
        <LeftSide
          showWeights={showWeights}
          onChange={onChange}
          selectedItems={selectedItems}
          items={items}
          readonly={readonly}
        />
        <RightSide showWeights={showWeights} onChange={onChange} selectedItems={selectedItems} readonly={readonly} />
      </div>
    </div>
  );
}

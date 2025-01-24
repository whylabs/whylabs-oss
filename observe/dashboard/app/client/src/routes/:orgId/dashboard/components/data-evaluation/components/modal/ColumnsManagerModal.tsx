import { IconColumns3 } from '@tabler/icons-react';
import { Colors } from '~/assets/Colors';
import { WhyLabsText } from '~/components/design-system';
import {
  ItemListSelectionModal,
  ItemListSelectionModalProps,
} from '~/components/design-system/modal/ItemListSelectionModal';
import { numbersToText } from '~/utils/numbersToText';
import { ReactElement } from 'react';

import { DataEvaluationBuilderChild } from '../../useDataEvaluationBuilderViewModel';
import { TABLE_COLUMN_GROUP_BY_LIMIT } from '../../utils';
import { useEvaluationCommonStyles } from '../utils';
import { useColumnsManagerModalViewModel } from './useColumnsManagerModalViewModel';

export const ColumnsManagerModal = ({ parentViewModel }: DataEvaluationBuilderChild): ReactElement | null => {
  const { classes } = useEvaluationCommonStyles();

  const {
    items,
    removeItemHandler,
    selectItemHandler,
    searchState,
    selectedSegmentKey,
    isSegmentColumns,
    onClose,
    onApplyChanges,
    isOpen,
  } = useColumnsManagerModalViewModel({
    parentViewModel,
  });

  if (isSegmentColumns && !selectedSegmentKey) return null;

  const reachedSelectionLimit = items.selectedItems.size >= TABLE_COLUMN_GROUP_BY_LIMIT;
  const leftSection: ItemListSelectionModalProps['leftSection'] = {
    title: isSegmentColumns
      ? 'Available segments to select as columns'
      : 'Available reference profiles to select as columns ',
    listSubTitle: isSegmentColumns
      ? `Select from "${selectedSegmentKey}":`
      : `Select from all reference profiles (${items.availableItems.size}):`,
    items: [...items.availableItems.values()],
    handler: selectItemHandler,
    disabled: reachedSelectionLimit,
  };

  const rightSection: ItemListSelectionModalProps['rightSection'] = {
    title: isSegmentColumns
      ? `Selected segment as columns (up to ${numbersToText(TABLE_COLUMN_GROUP_BY_LIMIT)})`
      : `Selected reference profiles as columns (${TABLE_COLUMN_GROUP_BY_LIMIT} max)`,
    listSubTitle: isSegmentColumns ? 'Selected columns' : 'Selected reference profiles',
    items: [...items.selectedItems.values()],
    locked: [],
    handler: removeItemHandler,
    allowComprehensiveTargeting: true,
  };

  const title = (
    <div className={classes.modalTitleWrapper}>
      <IconColumns3 size={16} color={Colors.secondaryLight1000} />
      <WhyLabsText className={classes.modalTitle}>
        {isSegmentColumns ? (
          <>
            Manage selected segments to be used as table columns for{' '}
            <span className={classes.modalBold}>{selectedSegmentKey}</span>
          </>
        ) : (
          <>Select reference profiles for table columns</>
        )}
      </WhyLabsText>
    </div>
  );

  return (
    <ItemListSelectionModal
      isOpen={isOpen}
      title={title}
      onClose={onClose}
      leftSection={leftSection}
      rightSection={rightSection}
      searchState={searchState}
      cancelButton={{ label: 'Cancel', handler: onClose }}
      confirmButton={{ label: 'Apply changes', handler: onApplyChanges }}
    />
  );
};

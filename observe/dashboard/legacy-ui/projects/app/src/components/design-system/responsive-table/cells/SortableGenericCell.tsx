import { Colors } from '@whylabs/observatory-lib';
import { SortDirection } from 'generated/graphql';
import {
  IconArrowDown,
  IconArrowsSort,
  IconArrowUp,
  IconSortAscendingLetters,
  IconSortAscendingNumbers,
  IconSortDescendingLetters,
  IconSortDescendingNumbers,
} from '@tabler/icons';
import WhyLabsActionIcon from '../../icon/WhyLabsActionIcon';
import { SortableGenericCellProps } from './types';
import GenericCell from './GenericCell';
import { useCellStyles } from './CellStylesCSS';
import { getNextSortDirectionState } from './sortUtils';

function SortableGenericCell({
  sortDirection,
  sortType,
  onSortDirectionChange,
  background,
  ...genericCellProps
}: SortableGenericCellProps): JSX.Element {
  const { classes, cx } = useCellStyles(background);

  const noSortApplied = !sortDirection;

  const onClickHandler = () => {
    const newSortDirection = getNextSortDirectionState(sortDirection, sortType);
    onSortDirectionChange(newSortDirection);
  };

  const sortLabelAria = (() => {
    if (sortDirection && sortType === 'text') return 'Sorted alphabetically';
    if (sortDirection === SortDirection.Asc) return 'Sorted ascending';
    if (sortDirection === SortDirection.Desc) return 'Sorted descending';
    return 'Click to sort';
  })();

  const commonIconProps = { color: Colors.brandPrimary800, size: 18 };
  const renderSortButton = () => {
    if (sortDirection && sortType === 'number') {
      return renderNumberSortButton();
    }

    if (sortDirection && sortType === 'text') {
      return renderTextSortButton();
    }

    if (sortDirection === SortDirection.Asc) {
      return <IconArrowUp {...commonIconProps} />;
    }
    if (sortDirection === SortDirection.Desc) {
      return <IconArrowDown {...commonIconProps} />;
    }

    return <IconArrowsSort {...commonIconProps} color={Colors.brandSecondary800} />;
  };

  const renderNumberSortButton = () => {
    if (sortDirection === SortDirection.Asc) {
      return <IconSortAscendingNumbers {...commonIconProps} />;
    }

    return <IconSortDescendingNumbers {...commonIconProps} />;
  };

  const renderTextSortButton = () => {
    if (sortDirection === SortDirection.Asc) {
      return <IconSortAscendingLetters {...commonIconProps} />;
    }

    return <IconSortDescendingLetters {...commonIconProps} />;
  };

  return (
    <button
      data-testid="WhyLabsSortableHeaderCell"
      type="button"
      className={classes.root}
      style={{ paddingRight: 4 }}
      onClick={onClickHandler}
    >
      <GenericCell {...genericCellProps} />
      <WhyLabsActionIcon
        label={sortLabelAria}
        tooltip={sortLabelAria}
        size={24}
        variant="transparent"
        className={cx(classes.actionIcon, { [classes.sortingWrap]: noSortApplied })}
        data-show-on-hover={noSortApplied}
      >
        {renderSortButton()}
      </WhyLabsActionIcon>
    </button>
  );
}

export default SortableGenericCell;

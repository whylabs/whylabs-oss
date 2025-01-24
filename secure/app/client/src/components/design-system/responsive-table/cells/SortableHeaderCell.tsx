import { createStyles, getStylesRef } from '@mantine/core';
import {
  IconArrowDown,
  IconArrowUp,
  IconArrowsSort,
  IconSortAscendingLetters,
  IconSortAscendingNumbers,
  IconSortDescendingLetters,
  IconSortDescendingNumbers,
} from '@tabler/icons-react';
import { Colors } from '~/assets/Colors';
import WhyLabsActionIcon from '~/components/design-system/icon/WhyLabsActionIcon';
import { SortDirection, SortDirectionType, SortType } from '~/types/sortTypes';

import HeaderCell, { HEADER_CELL_HORIZONTAL_PADDING, HeaderCellProps } from './HeaderCell';

const useStyles = createStyles((_, background: SortableHeaderCellProps['background']) => ({
  root: {
    width: 'calc(100% - 2px)',
    height: '100%',
    border: 'unset',
    padding: 0,
    paddingRight: HEADER_CELL_HORIZONTAL_PADDING,
    backgroundColor: background?.default || 'white',
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: background?.onHover || Colors.brandSecondary100,
      '& [data-show-on-hover]': {
        opacity: 1,
        [`&.${getStylesRef('actionIcon')}`]: {
          background: Colors.brandSecondary300,
        },
      },
    },
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    transition: 'background-color 200ms',
  },
  sortingWrap: {
    opacity: 0,
    textAlign: 'end',
    fontFamily: 'Asap,sans-serif',
    fontSize: '12px',
    lineHeight: '1.5',
    fontWeight: 400,
    transition: 'opacity 150ms',
  },
  actionIcon: {
    ref: getStylesRef('actionIcon'),
    background: Colors.brandSecondary200,
    transition: 'background-color 200ms',
  },
}));

type SortableHeaderCellProps = Pick<HeaderCellProps, 'className' | 'children' | 'tooltipText'> & {
  sortDirection: SortDirectionType;
  sortType?: SortType;
  onSortDirectionChange: (sortDirection: SortDirectionType) => void;
  background?: { default?: string; onHover?: string };
};

const SortableHeaderCell = ({
  sortDirection,
  sortType,
  onSortDirectionChange,
  background,
  ...headerCellProps
}: SortableHeaderCellProps): JSX.Element => {
  const { classes, cx } = useStyles(background);

  const noSortApplied = !sortDirection;

  const onClickHandler = () => {
    const newSortDirection = getNextSortDirectionState();
    onSortDirectionChange(newSortDirection);
  };

  /**
   * Desc -> Asc -> undefined -> Desc
   */
  const getNextSortDirectionState = () => {
    switch (sortDirection) {
      case undefined:
        return SortDirection.Desc;
      case SortDirection.Desc:
        return SortDirection.Asc;
      case SortDirection.Asc:
      default:
        return undefined;
    }
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
    <button data-testid="WhyLabsSortableHeaderCell" type="button" className={classes.root} onClick={onClickHandler}>
      <HeaderCell {...headerCellProps} />
      <WhyLabsActionIcon
        label={sortLabelAria}
        tooltip={sortLabelAria}
        size={24}
        className={cx(classes.actionIcon, { [classes.sortingWrap]: noSortApplied })}
        data-show-on-hover={noSortApplied}
      >
        {renderSortButton()}
      </WhyLabsActionIcon>
    </button>
  );
};

export default SortableHeaderCell;

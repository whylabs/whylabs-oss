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
import { getWidestTiedCellScroll, handleTiedCellScroll } from '~/components/design-system/responsive-table/cells/utils';
import { ClickableDiv } from '~/components/misc/ClickableDiv';
import { SortDirection, SortDirectionType, SortType } from '~/types/sortTypes';

import HeaderCell, { HEADER_CELL_HORIZONTAL_PADDING, HeaderCellProps, SCROLL_PADDING_BUFFER } from './HeaderCell';

const useStyles = createStyles({
  flexWrapper: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    justifyContent: 'center',
    '&:hover': {
      '& [data-show-on-hover]': {
        opacity: 1,
        [`&.${getStylesRef('actionIcon')}`]: {
          background: Colors.brandSecondary300,
        },
      },
    },
    transition: 'background-color 200ms',
  },
  root: {
    width: '100%',
    border: 'unset',
    padding: 0,
    paddingRight: HEADER_CELL_HORIZONTAL_PADDING,
    cursor: 'pointer',
    backgroundColor: 'inherit',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  scrollableDiv: {
    width: '100%',
    overflowX: 'scroll',
    height: 8,
    '::-webkit-scrollbar': {
      WebkitAppearance: 'none',
      height: 7,
      borderTop: `1px solid #E8E8E8`,
      backgroundColor: '#FAFAFA',
    },
    '::-webkit-scrollbar-thumb': {
      borderRadius: 4,
      backgroundColor: 'rgba(0, 0, 0, .2)',
      WebkitBoxShadow: '0 0 1px rgba(255,255,255,.5)',
    },
    '::-webkit-scrollbar-thumb:hover': {
      backgroundColor: 'rgba(0, 0, 0, .5)',
    },
  },
  scrollBuffer: {
    paddingTop: 4,
    paddingBottom: 2,
  },
});

type SortableHeaderCellProps = Pick<
  HeaderCellProps,
  'className' | 'children' | 'tooltipText' | 'scrollableFixedWidth' | 'columnKey'
> & {
  sortDirection: SortDirectionType;
  sortType?: SortType;
  onSortDirectionChange: (sortDirection: SortDirectionType) => void;
  widthBuffer?: number;
};

const SortableHeaderCell = ({
  sortDirection,
  sortType,
  onSortDirectionChange,
  columnKey,
  widthBuffer = 0,
  scrollableFixedWidth,
  ...headerCellProps
}: SortableHeaderCellProps): JSX.Element => {
  const { classes, cx } = useStyles();

  const noSortApplied = !sortDirection;

  const getNextSortDirectionState = () => {
    // For numbers the sort order is: Desc -> Asc -> undefined -> Desc
    if (sortType === 'number') {
      switch (sortDirection) {
        case undefined:
          return SortDirection.Desc;
        case SortDirection.Desc:
          return SortDirection.Asc;
        case SortDirection.Asc:
        default:
          return undefined;
      }
    }

    // Default sort order: Asc -> Desc -> undefined -> Asc
    switch (sortDirection) {
      case undefined:
        return SortDirection.Asc;
      case SortDirection.Asc:
        return SortDirection.Desc;
      case SortDirection.Desc:
      default:
        return undefined;
    }
  };

  const onClickHandler = () => {
    const newSortDirection = getNextSortDirectionState();
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

  const widestCell = scrollableFixedWidth ? getWidestTiedCellScroll(columnKey) : undefined;
  const minScrollableWidth =
    scrollableFixedWidth && widestCell?.id ? widestCell.width + SCROLL_PADDING_BUFFER + widthBuffer : 0;
  const displayScrollBar = scrollableFixedWidth && Math.ceil(scrollableFixedWidth) < minScrollableWidth;

  return (
    <div className={classes.flexWrapper}>
      <ClickableDiv
        data-testid="WhyLabsSortableHeaderCell"
        className={cx(classes.root, { [classes.scrollBuffer]: !!displayScrollBar })}
        onClick={onClickHandler}
      >
        <HeaderCell {...headerCellProps} columnKey={columnKey} />
        <WhyLabsActionIcon
          label={sortLabelAria}
          tooltip={sortLabelAria}
          size={24}
          className={cx(classes.actionIcon, { [classes.sortingWrap]: noSortApplied })}
          data-show-on-hover={noSortApplied}
          // This button is decorative and does not need to be focusable
          tabIndex={-1}
        >
          {renderSortButton()}
        </WhyLabsActionIcon>
      </ClickableDiv>
      {displayScrollBar && (
        <div className={cx(classes.scrollableDiv)} onScroll={(ev) => handleTiedCellScroll(ev, columnKey)}>
          <div style={{ width: minScrollableWidth }} className={`${columnKey}-header-scroll`} />
        </div>
      )}
    </div>
  );
};

export default SortableHeaderCell;

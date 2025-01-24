import { createStyles, getStylesRef } from '@mantine/core';
import { Colors, Spacings } from '@whylabs/observatory-lib';
import { WhyLabsActionIcon, WhyLabsDropDown, WhyLabsSearchInput, WhyLabsText } from 'components/design-system';
import { ReactElement, useState } from 'react';
import { getParam } from 'pages/page-types/usePageType';
import { FilterKeys } from 'hooks/useFilterQueryString';
import { InvisibleButton } from 'components/buttons/InvisibleButton';
import { IconSortAscending, IconSortDescending } from '@tabler/icons';
import { useDebouncedState, useElementSize } from '@mantine/hooks';
import { useSearchParams } from 'react-router-dom';
import { SortDirection } from 'generated/graphql';
import { ModelSortBy, SortDirectionType } from 'hooks/useSort/types';
import { SortReturn } from 'hooks/useSort/useSort';
import { SortDropDown } from 'components/filter-area/components/SortDropDown';
import { WhyLabsRadioGroupOptions } from 'components/design-system/radio/WhyLabsRadioGroup';

const SORT_BUTTON_PADDING = 2;

const useStyles = createStyles((_, { width }: { width: number }) => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    backgroundColor: Colors.white,
    height: '100%',
    padding: Spacings.pageLeftPadding,
    minWidth: 280,
    width: width + 30,
    transition: 'all 200ms linear',
    flexShrink: 0,
    paddingRight: 15,
    paddingLeft: 15,
  },
  widgetLabel: {
    color: Colors.secondaryLight900,
    fontSize: 14,
    fontWeight: 600,
    lineHeight: 1.42,
  },
  controlWrapper: {
    transition: 'all 200ms',
    overflow: 'hidden',
    width: 'fit-content',
  },
  collapsedSearchInput: {
    paddingRight: 0,
  },
  flex: {
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
    width: 'fit-content',
    minWidth: 255,
  },
  controlsFlex: {
    display: 'flex',
    gap: 5,
    alignItems: 'center',
    flexShrink: 0,
  },
  sortIcon: {
    ref: getStylesRef('sortIcon'),
  },
  sortButton: {
    width: 36,
    height: 36,
    '&:hover': {
      background: Colors.secondaryLight50,
    },
  },
  activeSortButton: {
    backgroundColor: `${Colors.brandPrimary600} !important`,
    border: `1px solid ${Colors.brandPrimary700} !important`,

    '&:hover': {
      [`& .${getStylesRef('sortIcon')}`]: {
        stroke: Colors.white,
      },
    },
    [`& .${getStylesRef('sortIcon')}`]: {
      stroke: Colors.white,
    },
  },
  sortButtonWrapper: {
    marginLeft: 'auto',
    paddingRight: SORT_BUTTON_PADDING,
  },
}));

const INPUT_WIDTH = 212;
const FLEX_WIDTH = INPUT_WIDTH + SORT_BUTTON_PADDING;
const COLLAPSED_INPUT_WIDTH = 40;

type SearchAndFilterComboProps = {
  filterComponent: ReactElement;
  hasActiveFilters: boolean;
  sortBy: ModelSortBy;
  sortByDirection?: SortDirectionType;
  sortSetter: SortReturn<ModelSortBy>['setSort'];
};

export const SearchAndFilterCombo = ({
  filterComponent,
  hasActiveFilters,
  sortBy,
  sortByDirection,
  sortSetter,
}: SearchAndFilterComboProps): ReactElement => {
  const { ref, width } = useElementSize();
  const { classes, cx } = useStyles({ width });
  const [isSearchOpen, setIsSearchOpen] = useState(!!getParam(FilterKeys.searchString));
  const [sortOpen, setSortOpen] = useState(false);
  const [, setSearchParams] = useSearchParams();
  const currentSearchString = getParam(FilterKeys.searchString) ?? '';
  const [stagedSearchText, setStagedSearchText] = useDebouncedState<string>(currentSearchString, 300);
  if (currentSearchString !== stagedSearchText) {
    setSearchParams((curr) => {
      curr.delete(FilterKeys.searchString);
      if (stagedSearchText) curr.set(FilterKeys.searchString, stagedSearchText);
      return curr;
    });
  }
  const isSearchExpanded = isSearchOpen || currentSearchString;

  const onInputChange = (value: string) => setStagedSearchText(value);

  const getSearchInputWidth = () => {
    if (isSearchExpanded) return INPUT_WIDTH;
    return hasActiveFilters ? 0 : COLLAPSED_INPUT_WIDTH;
  };

  const UsedSortIcon = sortByDirection === SortDirection.Asc ? IconSortAscending : IconSortDescending;

  const renderDropDownContent = () => {
    return (
      <SortDropDown<ModelSortBy>
        onClose={() => setSortOpen(false)}
        sortBy={sortBy}
        sortSetter={sortSetter}
        sortByDirection={sortByDirection}
        sortFieldsList={RESOURCE_SORT_COLUMNS}
      />
    );
  };

  return (
    <div className={classes.root}>
      <WhyLabsText className={classes.widgetLabel}>Filter resources</WhyLabsText>
      <div className={classes.flex} ref={ref}>
        <div
          className={classes.controlsFlex}
          style={{ maxWidth: hasActiveFilters ? undefined : FLEX_WIDTH, minWidth: FLEX_WIDTH }}
        >
          <div
            className={classes.controlWrapper}
            style={{ minWidth: getSearchInputWidth(), width: getSearchInputWidth() }}
          >
            <InvisibleButton onClick={() => setIsSearchOpen(true)}>
              <WhyLabsSearchInput
                label="Search resources"
                hideLabel
                placeholder={isSearchExpanded ? 'Filter by name or ID' : ''}
                onChange={onInputChange}
                onFocus={() => setIsSearchOpen(!hasActiveFilters && true)}
                onBlur={() => setIsSearchOpen(false)}
                defaultValue={stagedSearchText ?? ''}
                variant="darker-border"
                className={cx({ [classes.collapsedSearchInput]: !isSearchExpanded })}
              />
            </InvisibleButton>
          </div>
          <div
            className={classes.controlWrapper}
            style={{
              paddingRight: hasActiveFilters ? 5 : 0,
            }}
          >
            {filterComponent}
          </div>
        </div>
        <div className={classes.sortButtonWrapper}>
          <WhyLabsDropDown
            position="bottom-end"
            width={280}
            opened={sortOpen}
            target={
              <WhyLabsActionIcon
                label="Change resources sorting"
                variant="outline"
                className={cx(classes.sortButton, { [classes.activeSortButton]: sortOpen })}
                onClick={() => setSortOpen((b) => !b)}
              >
                <UsedSortIcon size={18} stroke={2} className={classes.sortIcon} color={Colors.secondaryLight1000} />
              </WhyLabsActionIcon>
            }
            closeModal={() => setSortOpen(false)}
          >
            {renderDropDownContent()}
          </WhyLabsDropDown>
        </div>
      </div>
    </div>
  );
};

export const RESOURCE_SORT_COLUMNS: WhyLabsRadioGroupOptions[] = [
  { label: 'Resource name', value: 'Name' },
  { label: 'Freshness', value: 'Freshness' },
  { label: 'Last profiles with anomalies', value: 'LatestAlert' },
  { label: 'Anomalies in range', value: 'AnomaliesInRange' },
  { label: 'Resource type', value: 'ResourceType' },
  { label: 'Creation date', value: 'CreationTime' },
];

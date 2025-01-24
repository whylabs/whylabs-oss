import { WhyLabsButton, WhyLabsTooltip, WhyLabsDropDown } from 'components/design-system';
import { IconFilter, IconSortAscending, IconSortDescending } from '@tabler/icons';
import { Colors } from '@whylabs/observatory-lib';
import { Button, createStyles, getStylesRef } from '@mantine/core';
import { disabledBecauseAdHocText, useAdHocExists } from 'atoms/adHocAtom';
import { useState } from 'react';
import { Extends } from 'types/genericTypes';
import { SortDirection } from 'generated/graphql';
import { useSearchParams } from 'react-router-dom';
import { WhyLabsRadioGroupOptions } from 'components/design-system/radio/WhyLabsRadioGroup';
import { SortReturn } from 'hooks/useSort/useSort';
import { SortDirectionType } from 'hooks/useSort/types';
import { FilterDropDown } from './FilterDropDown';
import { FilterControlProps } from '../utils';
import { SortDropDown } from './SortDropDown';

const useStyles = createStyles(() => ({
  controlButton: {
    ref: getStylesRef('controlButton'),
    padding: '8px !important',
    border: `1px solid ${Colors.mantineLightGray}`,
    '&[data-opened-control="false"]:hover': {
      backgroundColor: Colors.brandSecondary200,
      [`& .${getStylesRef('icon')}`]: {
        stroke: Colors.brandPrimary700,
      },
    },
    '&[data-active-control="true"]': {
      [`& .${getStylesRef('icon')}`]: {
        stroke: `${Colors.orange} !important`,
      },
    },
    '&[data-opened-control="true"]': {
      backgroundColor: `${Colors.brandPrimary600} !important`,
      border: `1px solid ${Colors.brandPrimary600} !important`,
      [`& .${getStylesRef('icon')}`]: {
        stroke: `${Colors.white} !important`,
      },
    },
  },
  [`&.${getStylesRef('controlButton')}`]: {
    borderRight: 'none !important',
  },
  buttonIcon: {
    ref: getStylesRef('icon'),
    color: Colors.brandSecondary700,
  },
}));

type DropDownControl = 'filter' | 'sort' | null;
type AvailableControls = Extends<DropDownControl, 'filter' | 'sort'>;

export interface SortControlProps<SortBy extends string | undefined> {
  sortBy?: SortBy;
  sortByDirection?: SortDirectionType;
  sortSetter?: SortReturn<SortBy>['setSort'];
  sortFieldsList?: WhyLabsRadioGroupOptions[];
}
type ButtonControlsProps<SortBy extends string | undefined> = SortControlProps<SortBy> & FilterControlProps;

export const ButtonControls = <SortBy extends string | undefined>({
  sortByDirection,
  sortBy,
  sortSetter,
  sortFieldsList,
  filterKey,
  checkboxFilterList,
  filterDropDownTitle,
}: ButtonControlsProps<SortBy>): JSX.Element => {
  const adHocExists = useAdHocExists();
  const [searchParams] = useSearchParams();
  const [popUpOpen, setDropDownOpen] = useState<DropDownControl>(null);
  const { classes } = useStyles();
  const handleControlClick = (control: AvailableControls) => {
    const shouldClose = popUpOpen === control;
    setDropDownOpen(shouldClose ? null : control);
  };

  const enableFilter = Boolean(filterKey);
  const displaySort = sortBy && sortByDirection;

  const UsedSortIcon = sortByDirection === SortDirection.Asc ? IconSortAscending : IconSortDescending;

  const renderDropDownContent = () => {
    if (popUpOpen === 'filter' && filterKey)
      return (
        <FilterDropDown
          filterDropDownTitle={filterDropDownTitle}
          checkboxFilterList={checkboxFilterList}
          onClose={() => setDropDownOpen(null)}
          filterKey={filterKey}
        />
      );
    if (popUpOpen === 'sort' && sortBy && sortByDirection && sortSetter)
      return (
        <SortDropDown<SortBy>
          onClose={() => setDropDownOpen(null)}
          sortBy={sortBy}
          sortSetter={sortSetter}
          sortByDirection={sortByDirection}
          sortFieldsList={sortFieldsList}
        />
      );
    return null;
  };

  return (
    <WhyLabsTooltip label={adHocExists ? disabledBecauseAdHocText('filtering') : ''}>
      <div style={adHocExists ? { cursor: 'not-allowed' } : {}}>
        {(enableFilter || displaySort) && (
          <WhyLabsDropDown
            position="bottom-end"
            width={280}
            opened={!!popUpOpen}
            target={
              <Button.Group>
                {enableFilter && (
                  <WhyLabsButton
                    className={classes.controlButton}
                    onClick={() => handleControlClick('filter')}
                    data-opened-control={popUpOpen === 'filter'}
                    data-active-control={!!(filterKey && searchParams.getAll(filterKey).length)}
                    variant="outline"
                    color="gray"
                    disabled={adHocExists}
                    data-testid="filter-area__button"
                    aria-label="filter"
                  >
                    <IconFilter className={classes.buttonIcon} size={18} stroke={3} />
                  </WhyLabsButton>
                )}
                {displaySort && (
                  <WhyLabsButton
                    className={classes.controlButton}
                    data-opened-control={popUpOpen === 'sort'}
                    variant="outline"
                    color="gray"
                    disabled={adHocExists}
                    data-testid="sort-area__button"
                    aria-label="sort"
                    onClick={() => handleControlClick('sort')}
                  >
                    <UsedSortIcon className={classes.buttonIcon} size={18} stroke={3} />
                  </WhyLabsButton>
                )}
              </Button.Group>
            }
            closeModal={() => setDropDownOpen(null)}
          >
            {renderDropDownContent()}
          </WhyLabsDropDown>
        )}
      </div>
    </WhyLabsTooltip>
  );
};

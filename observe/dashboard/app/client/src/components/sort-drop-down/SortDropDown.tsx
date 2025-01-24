import { Divider, createStyles } from '@mantine/core';
import { IconSortAscending, IconSortDescending } from '@tabler/icons-react';
import { Colors } from '~/assets/Colors';
import { WhyLabsButton, WhyLabsRadioGroup, WhyLabsRadioGroupOptions, WhyLabsText } from '~/components/design-system';
import { InvisibleButton } from '~/components/misc/InvisibleButton';
import { UseSortReturn } from '~/hooks/useSort';
import { SortDirection, SortDirectionType } from '~/types/sortTypes';
import { ReactElement } from 'react';

const useStyles = createStyles(() => ({
  dropdownFlex: {
    display: 'flex',
    flexDirection: 'column',
    padding: '5px',
    alignItems: 'flex-start',
    gap: '1px',
  },
  dividerLabel: {
    padding: '8px 13px',
    width: '100%',
    '& div': {
      marginTop: 0,
      color: Colors.brandSecondary600,
    },
  },
  radiosGroupWrapper: {
    padding: '0px 10px 10px 10px',
  },
  closeButtonWrapper: {
    padding: '9px 10px',
    width: '100%',
  },
  directionWrapper: {
    padding: '10px 12px',
    display: 'flex',
    border: 'none',
    gap: '10px',
    width: '100%',
    borderRadius: '4px',
    fontWeight: 400,
    color: Colors.secondaryLight1000,
    backgroundColor: Colors.white,
    '& svg': {
      stroke: Colors.brandSecondary600,
    },
    '&[data-active-direction="true"]': {
      backgroundColor: Colors.brandPrimary600,
      color: Colors.white,
      '& svg': {
        stroke: Colors.white,
      },
    },
  },
  label: {
    fontSize: 14,
    fontFamily: 'Asap',
  },
}));
interface SortDropDownProps<SortBy extends string | undefined> {
  onClose?: () => void;
  sortBy: SortBy;
  sortByDirection: SortDirectionType;
  sortFieldsList?: WhyLabsRadioGroupOptions[];
  sortSetter: UseSortReturn<SortBy>['setSort'];
  customSortAscIcon?: ReactElement;
  customSortDescIcon?: ReactElement;
}
export const SortDropDown = <SortBy extends string | undefined>({
  sortBy,
  sortByDirection,
  sortFieldsList,
  onClose,
  sortSetter,
  customSortAscIcon,
  customSortDescIcon,
}: SortDropDownProps<SortBy>): JSX.Element => {
  const { classes } = useStyles();
  const handleSortFieldChanges = (newSortBy: string) => {
    if (newSortBy !== sortBy) {
      sortSetter(newSortBy as SortBy, sortByDirection);
    }
  };

  const handleDirectionChange = (direction: SortDirection) => {
    if (direction !== sortByDirection) {
      sortSetter(sortBy, direction);
    }
  };

  return (
    <div className={classes.dropdownFlex}>
      <Divider className={classes.dividerLabel} label="Ordering" />
      <InvisibleButton
        onClick={() => handleDirectionChange(SortDirection.Desc)}
        className={classes.directionWrapper}
        data-active-direction={sortByDirection === 'DESC'}
      >
        {customSortDescIcon || <IconSortDescending size={20} />}
        <WhyLabsText className={classes.label}>Descending</WhyLabsText>
      </InvisibleButton>
      <InvisibleButton
        onClick={() => handleDirectionChange(SortDirection.Asc)}
        className={classes.directionWrapper}
        data-active-direction={sortByDirection === 'ASC'}
      >
        {customSortAscIcon || <IconSortAscending size={20} />}
        <WhyLabsText className={classes.label}>Ascending</WhyLabsText>
      </InvisibleButton>
      {!!sortFieldsList?.length && (
        <>
          <Divider className={classes.dividerLabel} label="Apply sort to" />
          <div className={classes.radiosGroupWrapper}>
            <WhyLabsRadioGroup
              id="filter-area--radio-sort"
              label="Sort options"
              hideLabel
              spacing="md"
              orientation="column"
              size="md"
              onChange={handleSortFieldChanges}
              options={sortFieldsList}
              value={sortBy ?? undefined}
            />
          </div>
        </>
      )}

      {onClose && (
        <div className={classes.closeButtonWrapper}>
          <WhyLabsButton width="full" variant="outline" color="gray" onClick={onClose}>
            Close
          </WhyLabsButton>
        </div>
      )}
    </div>
  );
};

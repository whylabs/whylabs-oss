import { createStyles, Divider } from '@mantine/core';
import { Colors } from '@whylabs/observatory-lib';
import { WhyLabsButton, WhyLabsRadioGroup, WhyLabsText } from 'components/design-system';
import { WhyLabsRadioGroupOptions } from 'components/design-system/radio/WhyLabsRadioGroup';
import { IconSortAscending, IconSortDescending } from '@tabler/icons';
import { SortDirection } from 'generated/graphql';
import { SortReturn } from 'hooks/useSort/useSort';
import { SortDirectionType } from 'hooks/useSort/types';

const useStyles = createStyles(() => ({
  dropDownTitle: {
    fontSize: '16px',
    fontWeight: 600,
    margin: '10px 10px 6px 10px',
    color: Colors.brandSecondary900,
  },
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
    fontSize: '14px',
    color: Colors.secondaryLight1000,
    padding: '10px 12px',
    display: 'flex',
    border: 'none',
    gap: '10px',
    width: '100%',
    borderRadius: '4px',
    fontWeight: 400,
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
}));
interface SortDropDownProps<SortBy extends string | undefined> {
  onClose: () => void;
  sortBy: SortBy;
  sortByDirection: SortDirectionType;
  sortFieldsList?: WhyLabsRadioGroupOptions[];
  sortSetter: SortReturn<SortBy>['setSort'];
}
export const SortDropDown = <SortBy extends string | undefined>({
  sortBy,
  sortByDirection,
  sortFieldsList,
  onClose,
  sortSetter,
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
      <button
        onClick={() => handleDirectionChange(SortDirection.Desc)}
        type="button"
        className={classes.directionWrapper}
        data-active-direction={sortByDirection === 'DESC'}
      >
        <IconSortDescending size={20} />
        <WhyLabsText size={14}>Descending</WhyLabsText>
      </button>
      <button
        onClick={() => handleDirectionChange(SortDirection.Asc)}
        type="button"
        className={classes.directionWrapper}
        data-active-direction={sortByDirection === 'ASC'}
      >
        <IconSortAscending size={20} />
        <WhyLabsText size={14}>Ascending</WhyLabsText>
      </button>
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
          options={sortFieldsList ?? []}
          value={sortBy ?? undefined}
        />
      </div>
      <div className={classes.closeButtonWrapper}>
        <WhyLabsButton width="full" variant="outline" color="gray" onClick={onClose}>
          Close
        </WhyLabsButton>
      </div>
    </div>
  );
};

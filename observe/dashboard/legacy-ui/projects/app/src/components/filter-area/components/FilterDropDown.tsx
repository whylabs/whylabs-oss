import { createStyles, Divider } from '@mantine/core';
import { Colors } from '@whylabs/observatory-lib';
import { useDebouncedState } from '@mantine/hooks';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import isEqual from 'lodash/isEqual';
import { WhyLabsButton, WhyLabsCheckboxGroup, WhyLabsText } from 'components/design-system';
import { FilterKeys } from 'hooks/useFilterQueryString';
import { FilterControlProps } from '../utils';

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
    margin: '8px 13px',
    '& div': {
      marginTop: 0,
      color: Colors.brandSecondary600,
    },
  },
  sectionWrapper: {
    width: '100%',
  },
  checkboxGroupWrapper: {
    padding: '0px 10px 10px 10px',
  },
  closeButtonWrapper: {
    padding: '9px 10px',
    width: '100%',
  },
}));
interface FilterDropDownProps extends Omit<FilterControlProps, 'filterKey'> {
  onClose: () => void;
  filterKey: FilterKeys;
}
export const FilterDropDown: React.FC<FilterDropDownProps> = ({
  filterDropDownTitle,
  checkboxFilterList,
  onClose,
  filterKey,
}) => {
  const { classes } = useStyles();
  const [searchParams, setSearchParams] = useSearchParams();
  const [debouncedFilters, setDebouncedFilters] = useDebouncedState<string[]>(searchParams.getAll(filterKey), 200);
  const [activeFilters, setActiveFilters] = useState<string[]>(searchParams.getAll(filterKey));

  if (!isEqual(debouncedFilters, searchParams.getAll(filterKey))) {
    setSearchParams((currentParams) => {
      currentParams.delete(filterKey);
      debouncedFilters.forEach((f) => currentParams.append(filterKey, f));
      return currentParams;
    });
  }

  const handleFilterChanges = (newFilters: string[]) => {
    setActiveFilters(newFilters);
    setDebouncedFilters(newFilters);
  };

  return (
    <div className={classes.dropdownFlex}>
      {filterDropDownTitle && <WhyLabsText className={classes.dropDownTitle}>{filterDropDownTitle}</WhyLabsText>}
      {checkboxFilterList?.map(({ sectionLabel, key, items }, index) => (
        <div key={key} className={classes.sectionWrapper}>
          {(sectionLabel || index > 0) && <Divider className={classes.dividerLabel} label={sectionLabel} />}
          <div className={classes.checkboxGroupWrapper}>
            <WhyLabsCheckboxGroup
              id="filter-area--checkbox-filter-dataset-types"
              label="Events filter"
              spacing="md"
              orientation="column"
              hideLabel
              labelTooltip="Filter viewable events"
              onChange={handleFilterChanges}
              options={items}
              value={activeFilters}
            />
          </div>
        </div>
      ))}
      <div className={classes.closeButtonWrapper}>
        <WhyLabsButton width="full" variant="outline" color="gray" onClick={onClose}>
          Close
        </WhyLabsButton>
      </div>
    </div>
  );
};

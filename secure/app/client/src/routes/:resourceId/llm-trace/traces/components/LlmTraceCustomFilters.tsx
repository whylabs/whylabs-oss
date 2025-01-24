import { createStyles } from '@mantine/core';
import { IconFilter } from '@tabler/icons-react';
import { Fragment, useState } from 'react';
import { Colors } from '~/assets/Colors';
import { WhyLabsButton, WhyLabsDropDown, WhyLabsText } from '~/components/design-system';
import { useLlmSecureContext } from '~/routes/:resourceId/llm-trace/LlmTraceLayout';
import { dimensionOptions } from '~/routes/:resourceId/llm-trace/traces/components/utils';

import { ComposedFilterElement } from './ComposedFilterElement';

const AVAILABLE_DIMENSIONS = dimensionOptions.filter(({ disabled }) => !disabled).length;

const useStyles = createStyles(() => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    padding: 15,
    gap: 8,
  },
  sectionTitle: {
    color: Colors.brandSecondary600,
    fontSize: 12,
    textWrap: 'nowrap',
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
    gap: 10,
  },
  sectionLine: {
    background: Colors.secondaryLight300,
    height: 1,
    flex: 1,
  },
  buttonsContainer: {
    display: 'flex',
    gap: 10,
  },
  customFiltersButton: {
    background: Colors.brandPrimary600,
  },
}));

type LlmTraceCustomFiltersProps = {
  violationTagsOptions: string[];
};

const Section = ({ children, leftLine }: { children: string; leftLine?: boolean }) => {
  const { classes } = useStyles();
  return (
    <div className={classes.sectionTitle}>
      {!!leftLine && <span className={classes.sectionLine} />}
      <WhyLabsText inherit>{children}</WhyLabsText>
      <span className={classes.sectionLine} />
    </div>
  );
};

export const LlmTraceCustomFilters = ({ violationTagsOptions }: LlmTraceCustomFiltersProps) => {
  const { classes } = useStyles();
  const { composedFilterAtom } = useLlmSecureContext();
  const [opened, setOpened] = useState(false);

  const {
    addFilter,
    clear,
    deleteFilter,
    filters,
    onChangeCondition,
    onChangeDimension,
    onChangeValue,
    readyToQueryFilters,
  } = composedFilterAtom;

  const toggleDropdown = () => {
    setOpened((prev) => !prev);
  };

  const onClose = () => {
    setOpened(false);
  };

  const usedDimensionsList = new Set(filters.map(({ dimension }) => dimension));

  const dimensionOptionsFor = (index: number) =>
    dimensionOptions.filter((d) => {
      // If it is the current selected dimension for the filter, allow it
      if (filters[index].dimension === d.value) return true;

      // Disallow already used dimensions to be selected again
      return !usedDimensionsList.has(d.value);
    });

  const allowToAddNewFilter = (() => {
    // Are there dimensions available to select?
    if (AVAILABLE_DIMENSIONS <= filters.length) return false;

    // Make sure all filters are ready to query before allowing to add more
    return readyToQueryFilters.length === filters.length;
  })();

  return (
    <WhyLabsDropDown
      withinPortal
      target={
        <WhyLabsButton
          className={classes.customFiltersButton}
          leftIcon={<IconFilter size={18} />}
          onClick={toggleDropdown}
          variant="filled"
        >
          Custom filters {readyToQueryFilters.length ? `(${readyToQueryFilters.length})` : ''}
        </WhyLabsButton>
      }
      opened={opened}
      onClose={onClose}
    >
      <div className={classes.root}>
        <Section>Custom filters</Section>
        {filters.map((filter, index) => {
          const isLast = index === filters.length - 1;

          const onDelete = filters.length > 1 ? () => deleteFilter(index) : undefined;

          return (
            // eslint-disable-next-line react/no-array-index-key
            <Fragment key={index}>
              <ComposedFilterElement
                dimensionOptions={dimensionOptionsFor(index)}
                filter={filter}
                onChangeDimension={onChangeDimension(index)}
                onChangeCondition={onChangeCondition(index)}
                onChangeValue={onChangeValue(index)}
                onDelete={onDelete}
                violationTagsOptions={violationTagsOptions}
              />
              {!isLast && <Section leftLine>AND</Section>}
            </Fragment>
          );
        })}

        <div className={classes.buttonsContainer}>
          <WhyLabsButton color="gray" variant="outline" onClick={clear}>
            Clear
          </WhyLabsButton>
          {allowToAddNewFilter && (
            <WhyLabsButton onClick={addFilter} variant="outline">
              Add filter
            </WhyLabsButton>
          )}
        </div>
      </div>
    </WhyLabsDropDown>
  );
};

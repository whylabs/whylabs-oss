import { createStyles, getStylesRef } from '@mantine/core';

import {
  COMPOSED_FILTER_LIST_CONDITIONS,
  COMPOSED_FILTER_NUMBER_CONDITIONS,
} from 'hooks/composed-filter/composedFilterConditions';
import { ComposedFilterOption, EXCLUDES_CONDITION, INCLUDES_CONDITION } from 'hooks/composed-filter/types';
import { useComposedFilter } from 'hooks/composed-filter/useComposedFilter';
import { handlePlural } from 'utils/stringUtils';
import { isString } from 'utils/typeGuards';
import { ComponentProps, Fragment, ReactElement, useState } from 'react';

import { Colors } from '@whylabs/observatory-lib';
import { IconFilter, IconX } from '@tabler/icons';
import { WhyLabsBadge, WhyLabsButton, WhyLabsDropDown, WhyLabsText, WhyLabsTooltip } from '../design-system';
import { MULTI_SELECT_CLOSE_ICON_COLOR } from '../design-system/select/WhyLabsMultiSelect';
import { ComposedFilterElement, ListFilterOption } from './ComposedFilterElement';

const useStyles = createStyles(() => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    padding: 15,
    gap: 5,
  },
  footer: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  footerInfo: {
    color: Colors.brandSecondary600,
    fontFamily: 'Inconsolata',
    fontSize: 14,
    fontWeight: 700,
    textTransform: 'uppercase',
  },
  buttonsContainer: {
    display: 'flex',
    gap: 10,
  },
  buttonBadgesContainer: {
    display: 'flex',
    gap: 6,
  },
  filtersButton: {
    fontWeight: 500,
    padding: '0 15px',
    '&:hover': {
      backgroundColor: `${Colors.secondaryLight100}`,
    },
    '&:active': {
      transform: 'unset',
    },
    '&:focus': {
      borderColor: '#228be6',
    },
  },
  buttonLabel: {
    ref: getStylesRef('buttonLabel'),
  },
  noHoverState: {
    '&:hover': {
      backgroundColor: `initial`,
    },
  },
  activeFiltersButton: {
    '&, &:hover': {
      borderColor: Colors.brandPrimary700,
      background: Colors.brandPrimary700,
      [`.${getStylesRef('buttonLabel')}`]: {
        color: Colors.white,
      },
    },
  },
  filtersBadge: {
    borderRadius: '0.25rem',
    fontFamily: 'Inconsolata',
    height: 22,
    '& *': {
      fontFamily: 'Inconsolata',
    },
  },
  filtersBadgeDeleteButton: {
    alignItems: 'center',
    color: MULTI_SELECT_CLOSE_ICON_COLOR,
    display: 'flex',
    justifyContent: 'center',
  },
}));

type GetListFilterOptions = Pick<ComponentProps<typeof ComposedFilterElement>, 'getListFilterOptionsFor'>;

export type CustomComposedFiltersProps = GetListFilterOptions & {
  composedFilterViewModel: ReturnType<typeof useComposedFilter>;
  createListDisplayName: (selectedLabels: string[], dimension: string) => string;
  replaceFullDisplayName?: boolean;
  convertListValueToReadableName: (value: string) => string;
  renderFilterCustomBadges?: (
    selectedItems: ListFilterOption[],
    dimension: string,
    defaultBadge: ReactElement,
    index: number,
  ) => ReactElement | null;
  maxExpandedItems?: number;
  filterId?: string;
  isLoadingOptions?: boolean;
};

export const CustomComposedFilters = ({
  composedFilterViewModel,
  createListDisplayName,
  convertListValueToReadableName,
  replaceFullDisplayName,
  getListFilterOptionsFor,
  renderFilterCustomBadges,
  maxExpandedItems = 4,
  filterId,
  isLoadingOptions,
}: CustomComposedFiltersProps): ReactElement => {
  const { classes, cx } = useStyles();
  const [isOpenCustomFiltersDropdown, setIsOpenCustomFiltersDropdown] = useState(false);

  const {
    addFilter,
    deleteFilter,
    dimensionOptions,
    filters,
    onChangeCondition,
    onChangeDimension,
    onChangeValue,
    readyToQueryFilters,
    hideConditionSelection,
  } = composedFilterViewModel;

  const hasAppliedFilters = !!readyToQueryFilters.length;

  const toggleDropdown = () => {
    setIsOpenCustomFiltersDropdown((prev) => !prev);
  };

  const onCloseFiltersDropdown = () => {
    setIsOpenCustomFiltersDropdown(false);
  };

  const usedDimensionsList = new Set<string>([]);
  const usedDimensionsConditionList = new Set<string>([]);
  filters.forEach(({ condition, dimension }) => {
    if (!dimension) return;
    usedDimensionsList.add(dimension);

    if (!condition) return;
    usedDimensionsConditionList.add(`${dimension}|${condition}`);
  });

  const dimensionOptionsFor = (index: number) => {
    return dimensionOptions.filter((d) => {
      // If it is the current selected dimension for the filter, allow it
      if (filters[index].dimension === d.value) return true;
      const dimensionAlreadySelected = filters.some((f) => f.dimension === d.value);
      if (dimensionAlreadySelected && d.disableCondition) return false;
      if (d.type === 'list') {
        // Allow to select a list dimension again if any combination of conditions is not already selected
        return COMPOSED_FILTER_LIST_CONDITIONS.some((c) => !usedDimensionsConditionList.has(`${d.value}|${c.value}`));
      }

      if (d.type === 'number') {
        // Allow to select a number dimension again if any combination of conditions is not already selected
        return COMPOSED_FILTER_NUMBER_CONDITIONS.some((c) => !usedDimensionsConditionList.has(`${d.value}|${c.value}`));
      }

      // Disallow already used dimensions to be selected again
      return !usedDimensionsList.has(d.value);
    });
  };

  const conditionOptionsFor = (index: number) => {
    const { selectedDimension } = filters[index];
    if (!selectedDimension) return [];

    const isConditionAllowed = (c: ComposedFilterOption) => {
      // If it is the current selected condition for the filter, allow it
      if (filters[index].condition === c.value) return true;

      // Disallow already used conditions for the selected dimension to be selected again
      return !usedDimensionsConditionList.has(`${selectedDimension.value}|${c.value}`);
    };

    if (selectedDimension.type === 'number') {
      return COMPOSED_FILTER_NUMBER_CONDITIONS.filter(isConditionAllowed);
    }

    if (selectedDimension.type === 'list') {
      return COMPOSED_FILTER_LIST_CONDITIONS.filter(isConditionAllowed);
    }

    return [];
  };

  const allowToAddNewFilter = (() => {
    const availableDimensions = dimensionOptions.filter(({ disabled }) => !disabled).length;

    // Are there dimensions available to select?
    if (availableDimensions <= filters.length) return false;

    // Make sure all filters are ready to query before allowing to add more
    return readyToQueryFilters.length === filters.length;
  })();

  const filtersButtonIcon = (() => {
    const fallbackColor = isOpenCustomFiltersDropdown ? Colors.white : Colors.secondaryLight1000;
    const displayOrangeButton = hasAppliedFilters && !isOpenCustomFiltersDropdown;
    const color = displayOrangeButton ? Colors.orange : fallbackColor;
    const fill = displayOrangeButton ? Colors.orange : 'transparent';

    return <IconFilter color={color} fill={fill} size={18} strokeWidth="2px" />;
  })();

  const filtersButtonLabel = (() => {
    const quantity = readyToQueryFilters.length;

    // Display badges if there are 1 to 3 filters applied
    if (quantity > 0 && (quantity <= maxExpandedItems || renderFilterCustomBadges)) {
      return (
        <div className={classes.buttonBadgesContainer}>
          {readyToQueryFilters.map((f, index) => {
            const isLast = index === readyToQueryFilters.length - 1;

            const selectedDimension = dimensionOptions.find((d) => d.value === f.dimension);
            const dimensionLabel = selectedDimension?.label ?? f.dimension;

            const [label, selectedOptions] = (() => {
              if (selectedDimension?.type === 'list') {
                const selectedListOptions = getListFilterOptionsFor(f.dimension);
                const values = f.value.split(',');
                const selectedValuesItems = values.map((v) => selectedListOptions.find((o) => o.value === v) ?? v);

                const valuesLabel = selectedValuesItems.map((option) => {
                  return convertListValueToReadableName(isString(option) ? option : option?.label ?? option.value);
                });

                const conditionLabel = (() => {
                  // Plural handler for the condition
                  if (f.condition === EXCLUDES_CONDITION) return 'exclude';
                  if (f.condition === INCLUDES_CONDITION || !f.condition) return 'include';
                  return f.condition;
                })();

                const displayName = createListDisplayName(valuesLabel, f.dimension);
                if (replaceFullDisplayName) {
                  return [displayName, selectedValuesItems];
                }

                if (values.length > 1) {
                  return [`${dimensionLabel} ${conditionLabel} (${displayName})`, selectedValuesItems];
                }
                return [`${dimensionLabel} ${conditionLabel} ${valuesLabel.join(' or ')}`, selectedValuesItems];
              }

              return [`${dimensionLabel} ${f.condition ?? '='} ${f.value}`, [f.value]];
            })();

            const onDeleteFilter = deleteFilter(f.index);

            const commonProps: Partial<ComponentProps<typeof WhyLabsBadge>> = {
              className: classes.filtersBadge,
              customBackground: Colors.brandSecondary100,
              customColor: Colors.gray900,
            };

            const concatenationBadge = (() => {
              if (isLast) return null;
              return <WhyLabsBadge {...commonProps}>AND</WhyLabsBadge>;
            })();

            const deleteButton = (
              <div
                className={classes.filtersBadgeDeleteButton}
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteFilter();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onDeleteFilter();
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <IconX size={14} />
              </div>
            );

            const defaultFilterBadge = (
              <WhyLabsBadge {...commonProps} rightSection={deleteButton}>
                {label}
              </WhyLabsBadge>
            );

            if (!renderFilterCustomBadges) {
              return (
                <Fragment key={label.toString()}>
                  {defaultFilterBadge}
                  {concatenationBadge}
                </Fragment>
              );
            }
            const items = isString(selectedOptions) ? [selectedOptions] : selectedOptions;
            const mappedItems = items.map((item) => (isString(item) ? { value: item } : item));
            const customComponent = renderFilterCustomBadges?.(mappedItems, f.dimension, defaultFilterBadge, index);
            return <Fragment key={label.toString()}>{customComponent}</Fragment>;
          })}
        </div>
      );
    }

    return (
      <div className={classes.buttonLabel}>
        {hasAppliedFilters ? `${quantity} ${handlePlural('filter', quantity)} applied` : 'No filters applied'}
      </div>
    );
  })();

  const tooltipLabel = (() => {
    if (isOpenCustomFiltersDropdown) return '';
    if (hasAppliedFilters) return 'Click to change applied filter conditions';
    return 'Click to apply filter conditions ';
  })();

  return (
    <WhyLabsDropDown
      target={
        <div style={{ width: 'fit-content' }}>
          <WhyLabsTooltip
            // This solves the tooltip not closing issue
            // when a filter is removed and the Dropdown size shrinks
            key={new Date().getTime()}
            label={tooltipLabel}
            withinPortal={false}
            position={hasAppliedFilters ? 'top' : 'bottom'}
            openDelay={hasAppliedFilters ? 1000 : 0}
          >
            <WhyLabsButton
              className={cx(classes.filtersButton, {
                [classes.activeFiltersButton]: isOpenCustomFiltersDropdown,
                [classes.noHoverState]: hasAppliedFilters && !isOpenCustomFiltersDropdown,
              })}
              color="gray"
              onClick={toggleDropdown}
              rightIcon={filtersButtonIcon}
              variant="outline"
              id={filterId}
            >
              {filtersButtonLabel}
            </WhyLabsButton>
          </WhyLabsTooltip>
        </div>
      }
      opened={isOpenCustomFiltersDropdown}
      position="bottom-start"
      onClose={onCloseFiltersDropdown}
      closeOnEscape
      withinPortal={false}
    >
      <div className={classes.root}>
        {filters.map((filter, index) => {
          const onDelete = readyToQueryFilters.length > 0 ? deleteFilter(index) : undefined;

          return (
            // eslint-disable-next-line react/no-array-index-key
            <Fragment key={index}>
              <ComposedFilterElement
                conditionOptions={conditionOptionsFor(index)}
                dimensionOptions={dimensionOptionsFor(index)}
                filter={filter}
                filterIndex={index}
                getListFilterOptionsFor={getListFilterOptionsFor}
                isLoadingOptions={isLoadingOptions}
                onChangeDimension={onChangeDimension(index)}
                onChangeCondition={onChangeCondition(index)}
                onChangeValue={onChangeValue(index)}
                onDelete={onDelete}
                hideConditionSelection={hideConditionSelection}
              />
            </Fragment>
          );
        })}

        <div className={classes.footer}>
          <div className={classes.buttonsContainer}>
            <WhyLabsButton color="gray" disabled={!allowToAddNewFilter} onClick={addFilter} variant="outline">
              Add filter
            </WhyLabsButton>
          </div>
          {/* eslint-disable-next-line react/jsx-curly-brace-presence */}
          <WhyLabsText className={classes.footerInfo}>{`'ESC' closes the filter panel`}</WhyLabsText>
        </div>
      </div>
    </WhyLabsDropDown>
  );
};

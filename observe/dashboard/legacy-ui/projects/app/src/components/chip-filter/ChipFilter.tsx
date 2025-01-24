import { Button, Chip, Divider, debounce, Input } from '@material-ui/core';
import { Search } from '@material-ui/icons';
import FilterListIcon from '@material-ui/icons/FilterList';
import { useAutocomplete } from '@material-ui/lab';
import { createStyles } from '@mantine/core';
import { CheckboxListItem, CheckboxPopup } from 'components/controls/widgets/CheckboxPopup';
import { HtmlTooltip, Colors, Spacings } from '@whylabs/observatory-lib';
import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchFeatureList } from 'hooks/useSearchFeatureList';
import CloseIcon from '@material-ui/icons/Close';
import { setHighlightedText } from 'utils/setHighlightText';
import CircularProgress from '@material-ui/core/CircularProgress';
import useFilterQueryString, { FilterKeys } from 'hooks/useFilterQueryString';
import useTypographyStyles from 'styles/Typography';
import { WhyLabsText } from 'components/design-system';
import { useUtilityStyles } from 'styles/UtilityStyles';

const useStyles = createStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    zIndex: 100,
    minWidth: Spacings.leftColumnWidth,
    backgroundColor: Colors.white,
  },
  container: {
    padding: Spacings.pageLeftPadding,
  },
  filterBox: {
    minHeight: Spacings.tabContentHeaderHeight,
    maxHeight: Spacings.tabContentHeaderHeight,
    height: Spacings.tabContentHeaderHeight,
  },
  titleRoot: {
    display: 'flex',
    justifyContent: 'space-between',
  },
  titleText: {
    fontWeight: 600,
    fontSize: '14px',
    fontFamily: 'Asap, sans-serif',
  },
  searchRoot: {
    display: 'flex',
    justifyContent: 'space-between',
  },
  divWrapper: {
    marginTop: '7px',
  },
  searchButton: {
    width: 33,
    minWidth: 33,
    padding: 0,
    backgroundColor: Colors.white,
  },
  searchIcon: {
    color: Colors.brandSecondary700,
    width: 15,
  },
  searchBox: {
    backgroundColor: Colors.white,
    flexGrow: 1,
    width: 242,
  },
  chipHeader: {
    display: 'flex',
    justifyContent: 'space-between',
  },
  chipClearAll: {
    fontSize: '14px',
    textDecoration: 'underline',
    color: Colors.linkColor,
    cursor: 'pointer',
    fontFamily: 'Asap, sans-serif',
  },
  chipList: {
    display: 'flex',
    flexWrap: 'wrap',
    maxWidth: 300,
    maxHeight: 147,
    overflowY: 'auto',
  },
  chipItem: {
    background: Colors.white,
    marginRight: '10px',
    marginTop: '10px',
  },
  chipCloseIcon: {
    height: '16px',
    width: '16px',
    color: Colors.grey,
    marginRight: '10px !important',
  },
  chipSectionContainer: {
    borderTop: `1px solid ${Colors.white}`,
  },
  loaderContainer: {
    position: 'relative',
  },
  loader: {
    position: 'absolute',
    right: '10px',
    top: '5px',
  },
  filterLabelText: {
    fontSize: '12px',
    color: Colors.brandSecondary900,
    fontFamily: 'Asap, sans-serif',
  },
});

const useSearchStyles = createStyles({
  root: {
    width: '250px',
    position: 'relative',
  },
  label: {
    display: 'block',
    fontWeight: 600,
    fontSize: '12px',
    fontFamily: 'Asap, Roboto, sans-serif',
  },
  input: {
    width: '100%',
    padding: '5px',
    borderRadius: '3px',
    border: '1px solid rgba(0, 0, 0, 0.25)',
    '&:focus': {
      border: `1px solid ${Colors.brandPrimary900}`,
      outline: `unset`,
    },
    fontFamily: 'Asap, Roboto, sans-serif',
  },
  listbox: {
    width: '242px',
    maxHeight: '200px',
    top: 0,
    margin: 0,
    marginTop: 2,
    padding: 0,
    zIndex: 1,
    position: 'absolute',
    listStyle: 'none',
    overflow: 'auto',
    border: '1px solid rgba(0, 0, 0, 0.25)',
    borderRadius: '4px',
    backgroundColor: Colors.white,
    '& li[data-focus="true"]': {
      backgroundColor: Colors.brandSecondary100,
      cursor: 'pointer',
    },
    '& li:active': {
      backgroundColor: Colors.brandSecondary100,
    },
    boxShadow: '0 10px 15px rgba(0, 0, 0, 0.15);',
  },
  listItem: {
    padding: '8px 15px 7px',
    fontFamily: 'Asap, Roboto, sans-serif',
    fontSize: '13px',
  },
  listItemDisabled: {
    opacity: 0.3,
    pointerEvents: 'none',
  },
});

interface ICheckboxItem {
  onChange: () => void;
  selected: boolean;
  value: string;
  text: string;
}

export interface ICheckboxCategory {
  category: string;
  list: ICheckboxItem[];
}

export interface IFilterState {
  [key: string]: boolean;
}

export interface IDropdownItem {
  label: string;
  value: string | number;
  disabled: boolean;
  autoSelect: boolean;
}

interface ICustomStyles {
  root?: React.CSSProperties;
  input?: React.CSSProperties;
}

export interface IChipFilterProps {
  onChange?: (newValue: string) => void;
  checkboxList: ICheckboxCategory[];
  onApply: (filters: IFilterState) => void;
  dropdownData: IDropdownItem[];
  onInputSelect?: (value: string) => void;
  customStyles?: ICustomStyles;
  checkboxPopupTitle: string;
  loading?: boolean;
  selectedTitle: string;
  title: string;
  tooltip: {
    search: string;
    selectedFeatures: string;
  };
}

export const ChipFilter = ({
  onChange,
  checkboxList,
  onApply,
  dropdownData,
  onInputSelect,
  checkboxPopupTitle,
  customStyles,
  selectedTitle,
  title,
  tooltip,
  loading,
}: IChipFilterProps): JSX.Element => {
  const { classes: styles, cx } = useStyles();
  const { classes: typography } = useTypographyStyles();
  const { classes: searchStyles } = useSearchStyles();
  const { classes: utiltyStyles } = useUtilityStyles();
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [filters, setFilters] = useState<IFilterState>({});
  const { featureList, setFeature } = useSearchFeatureList();
  const [searchString, setSearchString] = useState('');
  const { addFiltersToQueryParams, getFiltersFromQueryParams } = useFilterQueryString(FilterKeys.profileFilter);

  /**
   * Debounced handler for text change
   */

  const generateFilterLabel = () => {
    const num = getFiltersFromQueryParams();
    switch (num.length) {
      case 0:
        return 'No filters applied';
      case 1:
        return '1 filter applied';
      default:
        return `${num.length} filters applied`;
    }
  };

  const handleChange = useCallback(
    (searchText: string) => {
      if (onChange) onChange(searchText);
      setSearchString(searchText);
    },
    [setSearchString, onChange],
  );
  const debounceHandleChange = useMemo(
    () => debounce((searchText: string) => handleChange(searchText), 300),
    [handleChange],
  );

  function getCorrectedData() {
    return dropdownData.map((feature) => ({
      ...feature,
      disabled: featureList.includes(`${feature.value}`),
    }));
  }

  const { getInputProps, getListboxProps, getOptionProps, groupedOptions } = useAutocomplete({
    id: `Chip-Filter`,
    options: getCorrectedData(),
    onChange: (e, newValue, reason) => {
      if (reason === 'select-option') {
        const value = `${newValue?.value}`;
        if (onInputSelect) onInputSelect(value);
        setFeatureListAndResetPage([...featureList, value]);
      }
    },
    onInputChange: (e, newValue, reason) => {
      switch (reason) {
        case 'input':
          debounceHandleChange(newValue);
          break;

        case 'reset':
          if (!newValue) break;
          if (onInputSelect) onInputSelect(newValue);
          break;
      }
    },
    getOptionLabel: (option) => option.label,
    getOptionSelected: (testOption, valueOption) => testOption.value === valueOption.value,
  });

  /**
   * Used for generating "filters" state which is used to track
   * which checkboxes are selected.
   */
  useEffect(() => {
    const tempFilterState: IFilterState = {};
    const defaultFilters: string[] = [];

    checkboxList.forEach((category) =>
      category.list.forEach((checkbox) => {
        const isSelectedByDefault = checkbox.selected;
        tempFilterState[checkbox.value] = checkbox.selected;
        if (isSelectedByDefault) defaultFilters.push(checkbox.value);
      }),
    );

    addFiltersToQueryParams(defaultFilters);
    setFilters(tempFilterState);
  }, [addFiltersToQueryParams, getFiltersFromQueryParams, checkboxList]);

  function setFeatureListAndResetPage(featureNameList: string[]) {
    setFeature(featureNameList);
  }

  /**
   * Toggles checkbox state and executes specific checkbox callback
   */
  function onCheckboxChange(onChangeCallback: () => void, checkboxKey: string) {
    const filtersState = { ...filters };
    filtersState[checkboxKey] = !filtersState[checkboxKey];
    setFilters(filtersState);

    onChangeCallback();
  }

  /**
   * Produces JSX view for checkbox list.
   * Loops trough each category checkbox list and creates view JSX.
   */
  function generateCheckboxes() {
    const moreThanOne = checkboxList.length > 1;

    return checkboxList.map((category) => (
      <div key={category.category}>
        {category.list.map((checkbox, i) => (
          <CheckboxListItem
            // eslint-disable-next-line
            key={`${checkbox.value}-${i}`}
            onChange={() => onCheckboxChange(checkbox.onChange, checkbox.value)}
            selected={filters[checkbox.value]}
            text={checkbox.text}
            value={checkbox.value}
          />
        ))}
        {moreThanOne ? <Divider /> : null}
      </div>
    ));
  }

  function removeChip(chipName: string) {
    setFeatureListAndResetPage(featureList.filter((chip) => chip !== chipName));
  }

  function generateChips() {
    if (featureList.length > 0)
      return (
        <div className={styles.chipList}>
          {featureList.map((chip) => (
            <Chip
              key={`chip-${chip}`}
              className={styles.chipItem}
              variant="outlined"
              size="medium"
              label={chip}
              onDelete={() => removeChip(chip)}
              deleteIcon={<CloseIcon className={styles.chipCloseIcon} />}
            />
          ))}
        </div>
      );

    return null;
  }

  function handleApplyFilters() {
    const activeFilters = (Object.keys(filters) as Array<string>).reduce((acc, key) => {
      const val = filters[key];
      if (val) acc.push(key);

      return acc;
    }, [] as string[]);
    addFiltersToQueryParams(activeFilters);
    onApply(filters);
    setShowFilterMenu(false);
  }

  return (
    <div className={styles.root} style={customStyles?.root}>
      <div className={cx(styles.container, styles.filterBox)}>
        <div className={styles.titleRoot}>
          <WhyLabsText inherit className={styles.titleText}>
            {title}
            <HtmlTooltip tooltipContent={tooltip.search} />
          </WhyLabsText>
          <WhyLabsText inherit className={cx(typography.textThin, styles.filterLabelText)}>
            {generateFilterLabel()}
          </WhyLabsText>
        </div>
        <div className={cx(styles.searchRoot, styles.divWrapper)}>
          <div className={styles.searchRoot}>
            <div>
              <div className={styles.loaderContainer}>
                <Input
                  {...getInputProps()}
                  className={styles.searchBox}
                  startAdornment={<Search />}
                  style={customStyles?.input}
                />
                {loading && <CircularProgress classes={{ root: styles.loader }} size={20} />}
              </div>

              <div className={searchStyles.root}>
                {groupedOptions.length > 0 && (
                  <ul className={searchStyles.listbox} {...getListboxProps()}>
                    {groupedOptions.map((option, index) => (
                      <li
                        className={cx(searchStyles.listItem, option.disabled && searchStyles.listItemDisabled)}
                        {...getOptionProps({ option, index })}
                      >
                        {setHighlightedText(option.label, searchString)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
          <Button
            ref={buttonRef}
            aria-label="filter"
            variant="outlined"
            className={styles.searchButton}
            onClick={() => setShowFilterMenu(!showFilterMenu)}
          >
            <FilterListIcon
              className={styles.searchIcon}
              style={getFiltersFromQueryParams().length > 0 ? { color: Colors.orange } : {}}
            />
          </Button>
        </div>

        <div>
          {showFilterMenu && (
            <CheckboxPopup
              anchorEl={buttonRef.current}
              title={checkboxPopupTitle}
              onApply={handleApplyFilters}
              open={showFilterMenu}
              setOpen={setShowFilterMenu}
            >
              {generateCheckboxes()}
            </CheckboxPopup>
          )}
        </div>
      </div>

      {featureList.length > 0 && (
        <div className={cx(styles.container, styles.chipSectionContainer)}>
          <div className={styles.chipHeader}>
            <WhyLabsText inherit className={styles.titleText}>
              {selectedTitle}
              <HtmlTooltip tooltipContent={tooltip.selectedFeatures} />
            </WhyLabsText>
            <button type="button" className={utiltyStyles.invisibleButton} onClick={() => setFeature([])}>
              <WhyLabsText inherit className={styles.chipClearAll}>
                Clear all
              </WhyLabsText>
            </button>
          </div>
          {generateChips()}
        </div>
      )}
    </div>
  );
};

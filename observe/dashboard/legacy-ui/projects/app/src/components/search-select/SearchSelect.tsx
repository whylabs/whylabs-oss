import { useState } from 'react';
import { HtmlTooltip, Colors } from '@whylabs/observatory-lib';
import { Input, ListSubheader, MenuItem, Select } from '@material-ui/core';
import { createStyles } from '@mantine/core';
import { useModelWidgetStyles } from 'hooks/useModelWidgetStyles';
import { Search } from '@material-ui/icons';
import CloseIcon from '@material-ui/icons/Close';
import { WhyLabsText } from 'components/design-system';

const useSelectStyles = createStyles({
  searchSelect: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    height: '100%',
    backgroundColor: 'white',
  },
  label: {
    fontSize: '12px',
    color: Colors.black,
    paddingBottom: '4px',
  },
  dropdown: {
    fontSize: '14px',
    height: 38,
    minWidth: '250px',
    maxWidth: '250px',
  },
  dropdownCompact: {
    fontSize: '14px',
    height: 38,
    width: '230px',
  },
  select: {
    boxSizing: 'border-box',
    border: `1px solid ${Colors.brandSecondary900}`,
    borderRadius: 4,
    padding: 10,
    '&:focus': {
      background: 'none',
      borderRadius: 4,
    },
  },
  selectCompact: {
    boxSizing: 'border-box',
    border: `1px solid ${Colors.brandSecondary400}`,
    borderRadius: 4,
    padding: 10,
    '&:focus': {
      background: 'none',
      borderRadius: 4,
    },
  },
  selectIcon: {
    color: Colors.brandSecondary900,
    marginRight: '5px',
  },
  selectIconCompact: {
    color: Colors.brandSecondary600,
    marginRight: '5px',
  },
  selectItem: {
    fontSize: '14px',
    fontFamily: 'Asap',
    '&:hover': {
      backgroundColor: Colors.brandSecondary100,
    },
  },
  selectedItem: {
    background: `${Colors.brandSecondary100} !important`,
  },
  selectMenu: {
    background: Colors.white,
    borderRadius: '4px',
    border: '1px solid rgba(0, 0, 0, 0.25)',
    padding: 0,
  },
  selectMenuCompact: {
    background: Colors.white,
    borderRadius: '4px',
    border: '1px solid rgba(0, 0, 0, 0.6)',
    padding: 0,
  },
  defaultSelectItem: {
    fontStyle: 'italic',
    color: Colors.grey,
  },
  searchBox: {
    backgroundColor: Colors.white,
    flexGrow: 1,
    width: 240,
  },
  searchRoot: {
    display: 'flex',
    justifyContent: 'space-between',
  },
  emptyState: {
    fontSize: '14px',
    fontFamily: 'Asap',
    padding: '10px 15px',
  },
  selectPaper: {
    maxHeight: '600px',
  },
});

interface SearchSelectProps {
  onChange(id: string): void;
  selectString?: string;
  filterString?: string;
  allowUndefined?: boolean;
  compact?: boolean;
  tooltip?: string;
  disabled?: boolean | (string | undefined)[];
  loading?: boolean;
  options: { label: string; value: string }[];
  selectedOption: { label: string; value: string } | undefined;
}

export function SearchSelect({
  onChange,
  selectString,
  filterString,
  tooltip,
  allowUndefined = false,
  compact,
  disabled,
  loading,
  options,
  selectedOption,
}: SearchSelectProps): JSX.Element | null {
  const { classes: widgetStyles, cx } = useModelWidgetStyles();
  const { classes: styles } = useSelectStyles();
  const [searchText, setSearchText] = useState('');

  const filteredOptions = options.filter(
    (option) =>
      option.label.toLowerCase().includes(searchText.toLowerCase()) ||
      option.value?.toLowerCase().includes(searchText.toLowerCase()) ||
      searchText === '',
  );

  return (
    <div className={styles.searchSelect}>
      <div className={compact ? '' : widgetStyles.headlineColumn} style={{ height: '100%' }}>
        {filterString && (
          <WhyLabsText inherit className={cx(widgetStyles.bolded, widgetStyles.headline, widgetStyles.asap)}>
            {filterString}
            {tooltip && <HtmlTooltip tooltipContent={tooltip} />}
          </WhyLabsText>
        )}
        <Select
          className={compact ? styles.dropdownCompact : styles.dropdown}
          disabled={disabled === true || loading}
          disableUnderline
          renderValue={(a: unknown) => (selectedOption ? selectedOption.label : selectString)}
          MenuProps={{
            anchorOrigin: {
              vertical: 'bottom',
              horizontal: 'left',
            },
            anchorReference: 'anchorEl',
            transformOrigin: {
              vertical: 'top',
              horizontal: 'left',
            },
            getContentAnchorEl: null,
            PaperProps: {
              className: styles.selectPaper,
            },
            MenuListProps: {
              className: compact ? styles.selectMenu : styles.selectMenuCompact,
              subheader: (
                <ListSubheader component="div" className={styles.searchRoot}>
                  <Input
                    className={styles.searchBox}
                    startAdornment={<Search />}
                    value={searchText}
                    autoFocus
                    onChange={(event) => {
                      setSearchText(event.target.value);
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== 'Escape') {
                        event.stopPropagation();
                      }
                    }}
                    endAdornment={
                      searchText && (
                        <CloseIcon
                          style={{ cursor: 'pointer' }}
                          onClick={() => {
                            setSearchText('');
                          }}
                        />
                      )
                    }
                  />
                </ListSubheader>
              ),
              autoFocusItem: false,
              autoFocus: false,
            },
          }}
          classes={{
            select: compact ? styles.selectCompact : styles.select,
            icon: compact ? styles.selectIconCompact : styles.selectIcon,
            root: selectedOption === undefined ? styles.defaultSelectItem : '',
          }}
          labelId="model-selector"
          label={selectString}
          value={selectedOption?.value ?? ''}
          displayEmpty
          onChange={(event) => {
            onChange(event.target.value as string);
          }}
          onClose={() => setTimeout(() => setSearchText(''), 300)}
        >
          {allowUndefined && (
            <MenuItem
              className={cx(styles.selectItem, styles.defaultSelectItem)}
              value=""
              key="model-menu-null"
              disabled={selectedOption === undefined}
            >
              {selectString}
            </MenuItem>
          )}
          {filteredOptions.length ? (
            filteredOptions.map((option) => {
              return (
                <MenuItem
                  className={styles.selectItem}
                  classes={{ selected: styles.selectedItem }}
                  value={option.value}
                  key={`model-menu-${option.value}`}
                  disabled={typeof disabled === 'object' && disabled.indexOf(option.value) !== -1}
                >
                  {option.label}
                </MenuItem>
              );
            })
          ) : (
            <WhyLabsText inherit className={styles.emptyState}>
              No option found...
            </WhyLabsText>
          )}
        </Select>
      </div>
    </div>
  );
}

import { Dispatch, SetStateAction, useState } from 'react';
import { Checkbox, FormControlLabel, TextField } from '@material-ui/core';
import { createStyles } from '@mantine/core';
import { Colors } from '@whylabs/observatory-lib';
import SearchIcon from '@material-ui/icons/Search';
import { MultiSelectItem } from 'components/panels/monitoring/monitor-manager/custom-monitor/phase-cards/analysis/data-drift/SelectCard/useSelectCardData';
import useTypographyStyles from 'styles/Typography';
import { InvisibleButton } from 'components/buttons/InvisibleButton';
import useMultiselectCommonStyles from './commonStyles';

const useStyles = createStyles({
  leftSide: {
    borderRight: `1px solid ${Colors.brandSecondary400}`,
    minHeight: '45px',
    width: '363px',
    maxWidth: '363px',
  },
  search: {
    width: '100%',
    flexGrow: 1,
  },
  input: {
    padding: '0',
    fontFamily: 'Asap',
    fontSize: '14px',
    lineHeight: '20px',
  },
  listHeader: {
    padding: '8px 14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    '& span': {
      fontFamily: 'Asap',
      fontWeight: 600,
      fontSize: '14px',
      lineHeight: 1.4,
    },
  },
  checkboxContainer: {
    gap: '10px',
    padding: '8px 14px',
  },
  label: {
    fontSize: '14px',
    lineHeight: '20px',
    fontFamily: 'Asap',
  },
  searchArea: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    minHeight: '43px',
  },
  selectAllText: {
    fontFamily: 'Asap',
    width: 'fit-content',
    whiteSpace: 'nowrap',
    marginLeft: '2px',
  },
  button: {
    width: 'fit-content',
  },
});

interface LeftSideProps<T> {
  onChange: Dispatch<SetStateAction<T[]>>;
  selectedItems: T[];
  items: T[];
  readonly?: boolean;
  showWeights?: boolean;
}

export default function LeftSide<T extends MultiSelectItem>({
  onChange,
  selectedItems,
  items,
  readonly,
  showWeights,
}: LeftSideProps<T>): JSX.Element {
  const { classes: styles, cx } = useStyles();
  const { classes: commonStyles } = useMultiselectCommonStyles();
  const { classes: typography } = useTypographyStyles();

  const [filteredItems, setFilteredItems] = useState(items);

  const allItemsSelected = items.length === selectedItems.length;
  return (
    <div className={styles.leftSide}>
      <div className={cx(commonStyles.wrapperPadding, commonStyles.bottomBorder, styles.searchArea)}>
        <TextField
          className={styles.search}
          variant="standard"
          placeholder="Search..."
          InputProps={{
            disableUnderline: true,
            endAdornment: <SearchIcon style={{ color: Colors.brandSecondary700 }} />,
            classes: {
              input: styles.input,
            },
          }}
          InputLabelProps={{
            shrink: false,
          }}
          onChange={(e) => {
            setFilteredItems(items.filter((item) => item.label.includes(e.target.value)));
          }}
        />
        <InvisibleButton
          onClick={() => {
            if (readonly) return;
            onChange(items);
          }}
          className={styles.button}
        >
          <span
            className={cx(
              typography.linkLarge,
              styles.selectAllText,
              allItemsSelected ? commonStyles.disabledLink : '',
            )}
          >
            Select all
          </span>
        </InvisibleButton>
      </div>
      {showWeights && (
        <div className={cx(styles.listHeader, commonStyles.bottomBorder)}>
          <span>Feature name</span>
          <span>Feature importance</span>
        </div>
      )}
      <div className={cx(styles.checkboxContainer, commonStyles.container)}>
        {filteredItems.length ? (
          filteredItems.map((item) => {
            return (
              <div style={{ display: 'flex' }}>
                <FormControlLabel
                  key={item.id + item.label}
                  checked={selectedItems.some((sitem) => sitem.label === item.label)}
                  classes={{ label: styles.label }}
                  control={
                    <Checkbox
                      onChange={(e) => {
                        if (readonly) return;
                        if (e.target.checked) {
                          onChange((prev) => [...prev, item]);
                        } else {
                          onChange((prev) => prev.filter((i) => i.label !== item.label));
                        }
                      }}
                      className={commonStyles.checkBox}
                      style={{ paddingTop: 'unset', paddingBottom: 'unset' }}
                      color="primary"
                      value={item.label}
                      disabled={readonly}
                    />
                  }
                  label={item.label}
                />
                {showWeights && (
                  <span className={styles.label} style={{ marginLeft: 'auto' }}>
                    {item.weight}
                  </span>
                )}
              </div>
            );
          })
        ) : (
          <p>No items found...</p>
        )}
      </div>
    </div>
  );
}

import { createStyles, makeStyles, TextField } from '@material-ui/core';
import { Autocomplete } from '@material-ui/lab';
import { Colors } from '@whylabs/observatory-lib';
import cx from 'classnames';

export interface ISelectItem {
  label: string;
  value: string | number;
  disabled: boolean;
  groupBy?: string;
}

const useStyles = makeStyles(() =>
  createStyles({
    acInputRoot: {
      color: Colors.secondaryLight1000,
      fontFamily: 'Asap, Roboto, sans-serif',
      fontSize: '13px',
      padding: '0 !important',
      width: '100%',
    },
    acPaper: {
      background: Colors.white,
    },
    acOption: {
      color: Colors.secondaryLight1000,
      fontFamily: 'Asap, Roboto, sans-serif',
      fontSize: '13px',
      padding: '0 !important',
      '&:hover': {
        backgroundColor: Colors.brandSecondary100,
      },
    },
    tfRoot: {
      padding: '10px !important',
      fontSize: '14px',
    },
    cardTfRoot: {
      padding: '6px 6px !important',
    },
    listItem: {
      height: '100%',
      width: '100%',
      padding: '8px 15px 7px',
      fontFamily: 'Asap, Roboto, sans-serif',
      fontSize: '13px',
    },
    listItemDisabled: {},
    listbox: {
      padding: 0,
    },
    groupLabel: {
      lineHeight: '18px',
      padding: '8px 15px 7px',
      backgroundColor: Colors.brandSecondary300,
      fontWeight: 600,
      fontStyle: 'italic',
      color: Colors.brandSecondary900,
    },
  }),
);

export interface SelectAutoCompleteProps {
  id: string;
  options: ISelectItem[];
  value?: ISelectItem;
  onChange: (value: ISelectItem | null) => void;
  disabled?: boolean;
  placeholder?: string;
  card?: boolean;
  required?: boolean;
  inputValue?: string;
  style?: React.CSSProperties;
  inputRootClass?: string;
  loading?: boolean;
  defaultValue?: ISelectItem | undefined;
}

// Aware of at what position dropdown should appear unlike SelectAutoComplete
export default function SelectAutoComplete({
  options,
  value,
  inputValue,
  onChange,
  id,
  disabled = false,
  placeholder,
  card,
  required = false,
  inputRootClass = '',
  style = {},
  loading = false,
  defaultValue = undefined,
}: SelectAutoCompleteProps): JSX.Element {
  const styles = useStyles();
  const hasGroups = options.some((option) => option.groupBy);

  return (
    <Autocomplete
      id={id}
      options={options}
      getOptionLabel={(option) => option.label}
      disabled={disabled}
      disableClearable
      value={value}
      inputValue={inputValue}
      defaultValue={defaultValue}
      onChange={(_, option) => onChange(option)}
      getOptionDisabled={(option) => option.disabled}
      // valueOption is not typed correctly, so we must check if valueOption exists since it can be undefined in some cases.
      getOptionSelected={(testOption, valueOption) => {
        if (testOption && valueOption) {
          return testOption.value === valueOption.value;
        }
        return false;
      }}
      classes={{
        inputRoot: cx(styles.acInputRoot, inputRootClass),
        paper: styles.acPaper,
        option: styles.acOption,
        input: card ? styles.cardTfRoot : styles.tfRoot,
        listbox: styles.listbox,
        groupLabel: hasGroups ? styles.groupLabel : '',
      }}
      renderInput={(params) => (
        <TextField
          required={required}
          {...params}
          placeholder={loading ? 'Loading...' : placeholder}
          variant="outlined"
          InputLabelProps={{
            shrink: false,
          }}
        />
      )}
      groupBy={(option) => option.groupBy || ''}
      style={style}
      renderOption={(option) => (
        <span
          key={option.value}
          data-testid={option.label}
          className={cx(styles.listItem, option.disabled ? styles.listItemDisabled : '')}
        >
          {option.label}
        </span>
      )}
    />
  );
}

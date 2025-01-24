import { ChangeEvent, useState } from 'react';
import { createStyles, InputLabel, makeStyles, TextField } from '@material-ui/core';
import { Colors, HtmlTooltip } from '@whylabs/observatory-lib';
import cx from 'classnames';

const useCustomTextInput = makeStyles(() =>
  createStyles({
    textFieldWrapper: {
      display: 'flex',
      flexDirection: 'column',
    },

    textLabel: {
      marginBottom: 10,
      fontSize: 14,
      fontWeight: 600,
      textTransform: 'none',
      color: Colors.brandSecondary900,
    },
    numberField: {
      '& > div > input': {
        height: '40px',
        boxSizing: 'border-box',
        borderRadius: 4,
        fontSize: 14,
        fontFamily: 'asap',
      },
    },
    hiddenNumberFieldArrows: {
      '& input[type=number]': {
        '-moz-appearance': 'textfield',
      },
      '& input[type=number]::-webkit-outer-spin-button': {
        '-webkit-appearance': 'none',
        margin: 0,
      },
      '& input[type=number]::-webkit-inner-spin-button': {
        '-webkit-appearance': 'none',
        margin: 0,
      },
    },
  }),
);

export interface ICustomTextInput {
  id: string;
  value: number | null;
  onChange: (value: number | null) => void;
  label: React.ReactNode | string;
  min?: number;
  max?: number;
  step?: string;
  tooltip?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  hideArrows?: boolean;
  classes?: {
    input?: string;
  };
}

const NewCustomNumberInput: React.FC<ICustomTextInput> = ({
  id,
  label,
  onChange,
  disabled,
  value,
  min,
  max,
  tooltip,
  placeholder,
  required = false,
  hideArrows = true,
  step,
  classes,
}) => {
  const styles = useCustomTextInput();
  const [text, setText] = useState(value?.toString() ?? '');

  const handleChange = (e: ChangeEvent) => {
    const newValue = (e.target as HTMLInputElement).value;
    setText(newValue);
    onChange(Number(newValue));
  };

  return (
    <div data-testid="custom-input-number-wrapper" className={styles.textFieldWrapper}>
      <InputLabel data-testid="label" disabled={disabled} className={styles.textLabel} htmlFor={id}>
        {label}
        {tooltip !== undefined && <HtmlTooltip tooltipContent={tooltip} />}
      </InputLabel>
      <TextField
        className={cx(styles.numberField, hideArrows && styles.hiddenNumberFieldArrows, classes?.input)}
        type="number"
        id={id}
        value={text ?? ''}
        placeholder={placeholder || ''}
        onChange={handleChange}
        disabled={disabled}
        required={required}
        inputMode="decimal"
        inputProps={{ min, max, disableUnderline: true, step }}
        variant="outlined"
      />
    </div>
  );
};

export default NewCustomNumberInput;

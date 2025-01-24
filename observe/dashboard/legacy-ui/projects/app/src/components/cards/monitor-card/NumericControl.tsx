import { ChangeEvent, useCallback, useState } from 'react';
import TextField from '@material-ui/core/TextField';
import accounting from 'accounting';
import { isExactlyNullOrUndefined } from 'utils';
import { useControlStyles } from 'hooks/useControlStyles';

export interface NumericControlProps {
  id: string;
  label: string;
  subtext?: string;
  disabled?: boolean;
  value: number | null | undefined;
  handleChange?: (input: number | null) => void;
  min?: number | null | undefined;
  max?: number | null | undefined;
  decimals?: number;
  emptyText?: string;
  nonEmpty?: boolean;
  placeholder?: string;
  setButtonDisabled?: (dis: boolean) => void;
  setManualPreview?: (focused: boolean, newValue: number) => void;
  helperText?: boolean;
  required?: boolean;
}

const NumericControl: React.FC<NumericControlProps> = ({
  id,
  label,
  subtext,
  disabled,
  value,
  placeholder,
  min = Number.MIN_SAFE_INTEGER,
  max = Number.MAX_SAFE_INTEGER,
  handleChange,
  decimals = 0,
  emptyText = 'Auto',
  nonEmpty = false,
  setButtonDisabled,
  setManualPreview,
  helperText = false,
  required = false,
}) => {
  const parseValue = useCallback(
    (num: number | null | undefined) => {
      if (isExactlyNullOrUndefined(num)) {
        return '';
      }
      return accounting.formatNumber(num as number, decimals, ',', '.');
    },
    [decimals],
  );

  let tempShownValue = parseValue(value);
  if (value === null) {
    tempShownValue = emptyText;
  }
  const [shownValue, setShownValue] = useState<string | null>(tempShownValue);
  const [error, setError] = useState<boolean>(false);
  const { classes: styles, cx } = useControlStyles();

  const handleLeaveRequired = (event: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const tempValue = event?.target.value ?? '';
    const valueToUse = tempValue.replace(/,/g, '.');
    setShownValue(tempValue);
    if (handleChange) handleChange(null);
    const numericValue = Number(valueToUse);
    if (valueToUse.includes('..')) {
      setError(true);
    } else if (Number.isNaN(numericValue)) {
      setError(nonEmpty);

      if (setButtonDisabled) setButtonDisabled(true);
    } else {
      let valueError = false;
      if (!isExactlyNullOrUndefined(max) && numericValue > (max as number)) {
        valueError = true;
        if (setButtonDisabled) setButtonDisabled(true);
      }
      if (!isExactlyNullOrUndefined(min) && numericValue < (min as number)) {
        valueError = true;

        if (setButtonDisabled) setButtonDisabled(true);
      }

      if (!valueError && handleChange) {
        handleChange(numericValue);

        if (setButtonDisabled) setButtonDisabled(false);
      }

      setError(valueError);
    }
  };

  const handleLeaveOptional = (event: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const tempValue = event?.target.value ?? '';
    const valueToUse = tempValue.replace(/,/g, '.');
    setShownValue(tempValue);
    let valueError = false;
    const numericValue = Number(valueToUse);
    if (valueToUse.includes('..')) {
      setError(true);
    } else if (Number.isNaN(numericValue)) {
      if (handleChange) {
        handleChange(null);
      }
    } else {
      if (numericValue > (max as number)) {
        valueError = true;

        if (setButtonDisabled) setButtonDisabled(true);
      }
      if (numericValue < (min as number)) {
        valueError = true;
        if (setButtonDisabled) setButtonDisabled(true);
      }

      if (!valueError && handleChange) {
        if (setButtonDisabled) setButtonDisabled(false);
        handleChange(numericValue);
      }

      setError(valueError);
    }
  };

  return (
    <TextField
      data-testid="numeric-control"
      id={id}
      inputProps={{
        'data-testid': 'text-field-input',
      }}
      label={label}
      error={error && !disabled}
      helperText={subtext}
      value={shownValue}
      placeholder={placeholder || emptyText}
      onChange={(event) => {
        if (nonEmpty) {
          handleLeaveRequired(event);
        } else {
          handleLeaveOptional(event);
        }

        if (setManualPreview) setManualPreview(true, +event.target.value || 0);
      }}
      onBlur={() => {
        if (setManualPreview) setManualPreview(false, (shownValue && +shownValue) || 0);
      }}
      onFocus={() => {
        if (setManualPreview) setManualPreview(true, (shownValue && +shownValue) || 0);
      }}
      variant="outlined"
      size="small"
      disabled={!!disabled}
      className={cx(styles.monitorText, styles.zIndexCorrect)}
      InputLabelProps={{
        shrink: true,
      }}
      FormHelperTextProps={{
        className: cx({ [styles.helperText]: helperText }),
      }}
      required={required}
    />
  );
};

export default NumericControl;

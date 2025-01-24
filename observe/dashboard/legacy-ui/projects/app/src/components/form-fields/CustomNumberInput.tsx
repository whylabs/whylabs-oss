import { createStyles, InputLabel, makeStyles } from '@material-ui/core';
import { Colors, HtmlTooltip } from '@whylabs/observatory-lib';
import NumericControl from 'components/cards/monitor-card/NumericControl';

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
    monitorDefaults: {
      color: Colors.brandSecondary900,
    },
    textField: {
      marginTop: 10,
      fontSize: 14,
      fontFamily: 'asap',

      '& input': {
        padding: '8px 10px',
        height: 40,
        boxSizing: 'border-box',
      },

      '& fieldset': {
        top: 0,
        height: 40,
      },

      '& .MuiOutlinedInput-notchedOutline': {
        borderColor: Colors.brandSecondary200,
        transition: 'color 300ms linear',

        '& span': {
          display: 'none',
        },
      },

      '&:hover': {
        '& .MuiOutlinedInput-notchedOutline': {
          borderColor: Colors.brandSecondary400,
        },
      },
    },
  }),
);

export interface ICustomTextInput {
  id: string;
  value: number | null;
  onChange: (value: number | null) => void;
  label: React.ReactNode | string;
  subtext?: string;
  min?: number;
  max?: number;
  tooltip?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  setButtonDisabled?: (dis: boolean) => void;
  nonEmpty?: boolean;
  decimals?: number;
  setManualPreview?: (focused: boolean, newValue: number) => void;
  monitorDefaults?: boolean;
  helperText?: boolean;
}

const CustomNumberInput: React.FC<ICustomTextInput> = ({
  id,
  label,
  onChange,
  disabled,
  value,
  subtext,
  min,
  max,
  tooltip,
  placeholder,
  setButtonDisabled,
  nonEmpty,
  decimals = 0,
  setManualPreview,
  monitorDefaults = false,
  helperText = false,
  required = false,
}) => {
  const classes = useCustomTextInput();

  return (
    <div data-testid="custom-input-number-wrapper" className={classes.textFieldWrapper}>
      <InputLabel
        data-testid="label"
        disabled={disabled}
        className={cx({ [classes.textLabel]: true, [classes.monitorDefaults]: monitorDefaults })}
        htmlFor={id}
      >
        {label}
        {tooltip !== undefined && <HtmlTooltip tooltipContent={tooltip} />}
      </InputLabel>
      <NumericControl
        id={id}
        label=""
        subtext={subtext}
        min={min}
        max={max}
        helperText={helperText}
        decimals={decimals}
        value={value}
        placeholder={placeholder || ''}
        handleChange={onChange}
        disabled={disabled}
        nonEmpty={nonEmpty || false}
        setButtonDisabled={setButtonDisabled}
        setManualPreview={setManualPreview}
        required={required}
      />
    </div>
  );
};

export default CustomNumberInput;

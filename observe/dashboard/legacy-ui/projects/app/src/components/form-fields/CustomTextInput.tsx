import { ChangeEvent } from 'react';
import { createStyles, InputLabel, makeStyles, TextField } from '@material-ui/core';
import { Colors } from '@whylabs/observatory-lib';
import cx from 'classnames';

const useCustomTextInput = (props: { multiline: boolean | undefined }) =>
  makeStyles((theme) =>
    createStyles({
      textFieldWrapper: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      },

      textLabel: {
        fontSize: 14,
        fontWeight: 600,
        textTransform: 'none',
        color: Colors.secondaryLight900,
      },

      textField: {
        marginTop: 10,
        fontSize: 14,
        fontFamily: 'asap',
        resize: 'vertical',

        '& input': {
          padding: '8px 10px',
          height: props.multiline ? undefined : 40,
          boxSizing: 'border-box',
        },

        '& fieldset': {
          height: props.multiline ? undefined : 40,
          top: 0,
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
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  label?: React.ReactNode | string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  fullWidth?: boolean;
  placeholder?: string;
  inputName?: string;
  rows?: string | number;
  size?: 'small' | 'medium' | undefined;
  multiline?: boolean;
}

const CustomTextInput: React.FC<ICustomTextInput> = ({
  id,
  label,
  onChange,
  value,
  className = '',
  disabled = false,
  fullWidth = false,
  required = false,
  placeholder = '',
  inputName = '',
  rows,
  size = 'small',
  multiline = false,
}) => {
  const classes = useCustomTextInput({ multiline })();

  return (
    <div className={classes.textFieldWrapper}>
      <InputLabel className={classes.textLabel} htmlFor={id}>
        {label}
      </InputLabel>
      <TextField
        className={cx(classes.textField, className)}
        label=""
        id={id}
        value={value}
        onChange={onChange}
        variant="outlined"
        disabled={disabled}
        fullWidth={fullWidth}
        placeholder={placeholder}
        name={inputName}
        required={required}
        rows={rows}
        size={size}
        multiline={multiline}
        rowsMax={10}
      />
    </div>
  );
};

export default CustomTextInput;

import { ChangeEvent } from 'react';
import { createStyles, makeStyles, TextField } from '@material-ui/core';
import { Colors } from '@whylabs/observatory-lib';
import cx from 'classnames';

const useCustomTextInput = makeStyles(() =>
  createStyles({
    textField: {
      fontFamily: 'Asap',

      '& input': {
        padding: '8px 10px',
        height: 30,

        boxSizing: 'border-box',
      },

      '& fieldset': {
        top: 0,
        height: 30,
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
  id?: string;
  value: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  className?: string;
}

const CustomTableTextField: React.FC<ICustomTextInput> = ({ id, onChange, value, className }) => {
  const classes = useCustomTextInput();

  return (
    <TextField
      className={cx(classes.textField, className)}
      label=""
      id={id}
      defaultValue={value}
      onChange={onChange}
      variant="outlined"
      size="small"
    />
  );
};

export default CustomTableTextField;

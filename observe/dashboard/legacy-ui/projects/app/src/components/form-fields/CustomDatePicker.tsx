import { createStyles, InputLabel, makeStyles, TextField } from '@material-ui/core';
import { DatePicker } from '@material-ui/pickers';
import DateRangeIcon from '@material-ui/icons/DateRange';
import { Colors } from '@whylabs/observatory-lib';
import { dateOnlyFormat } from 'utils/dateUtils';
import { ParsableDate } from '@material-ui/pickers/constants/prop-types';
import cx from 'classnames';

const useCustomDatePicker = makeStyles(() =>
  createStyles({
    textFieldWrapper: {
      display: 'flex',
      flexDirection: 'column',
    },

    textLabel: {
      fontSize: 14,
      fontWeight: 600,
      textTransform: 'none',
      color: Colors.secondaryLight1000,
    },

    textField: {
      marginTop: 10,
      fontSize: 14,
      fontFamily: 'asap',

      '& input': {
        padding: '8px 10px',
        height: 40,
        boxSizing: 'border-box',

        '&::placeholder': {
          textTransform: 'uppercase',
        },
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

    datePickerPopper: {
      zIndex: 1,

      '& .MuiPaper-root': {
        backgroundColor: Colors.white,
      },

      '& .MuiPickersCalendarHeader-monthTitleContainer': {
        cursor: 'auto',
      },

      '& .MuiPickersArrowSwitcher-iconButton': {
        backgroundColor: 'transparent',
      },

      '& .MuiPickersDay-root': {
        color: Colors.secondaryLight1000,
        backgroundColor: 'transparent',
        border: `1px solid ${Colors.white}`,
        transition: 'background-color 300ms linear, color 300ms linear, border-color 300ms linear',

        '&.MuiPickersDay-today': {
          border: `1px solid ${Colors.brandPrimary700}`,
        },

        '&.Mui-selected': {
          backgroundColor: Colors.brandPrimary700,
          border: `1px solid ${Colors.white}`,
          color: Colors.white,
        },

        '&.Mui-disabled': {
          color: Colors.brandSecondary600,
          backgroundColor: Colors.brandSecondary100,
        },

        '&:hover': {
          border: `1px solid ${Colors.brandPrimary700}`,
        },
      },
    },
  }),
);

export interface ICustomDatePicker {
  id: string;
  value?: number | null;
  onChange: (date?: number | null) => void;
  onError?: (errMsg: string | null) => void | (() => void);
  label?: React.ReactNode | string;
  helperText?: string;
  disableOpenPicker?: boolean;
  disablePast?: boolean;
  minDate?: ParsableDate<number | undefined>;
  maxDate?: ParsableDate<number | undefined>;
  className?: string;
  disabled?: boolean;
}

const CustomDatePicker: React.FC<ICustomDatePicker> = ({
  id,
  label,
  onChange,
  onError = () => {
    /**/
  },
  value,
  helperText,
  disableOpenPicker,
  disablePast,
  minDate,
  maxDate,
  className,
  disabled,
}) => {
  const classes = useCustomDatePicker();

  return (
    <div className={cx(classes.textFieldWrapper, className)}>
      {label && (
        <InputLabel className={classes.textLabel} htmlFor={id}>
          {label}
        </InputLabel>
      )}
      <DatePicker
        minDate={minDate}
        maxDate={maxDate}
        disabled={disabled}
        views={['date']}
        openPickerIcon={<DateRangeIcon color="disabled" />}
        allowSameDateSelection={false}
        disableOpenPicker={disableOpenPicker}
        clearable={false}
        disablePast={disablePast}
        value={value || null} // passing "undefined" here results in rendering today's date.
        onChange={onChange}
        inputFormat={dateOnlyFormat}
        label=""
        onError={onError}
        renderInput={(props) => (
          <TextField
            id={id}
            {...props}
            className={classes.textField}
            helperText={helperText}
            variant="outlined"
            size="small"
            autoComplete="off"
          />
        )}
        PopperProps={{
          className: classes.datePickerPopper,
          disablePortal: true,
        }}
      />
    </div>
  );
};

export default CustomDatePicker;

import { Autocomplete, AutocompleteProps, createStyles } from '@mantine/core';
import { Colors, HtmlTooltip } from '@whylabs/observatory-lib';
import { forwardRef } from 'react';
import { isString } from 'utils/typeGuards';
import { GenericInputProps } from '../types/designSystemTypes';

const useStyles = createStyles(() => ({
  label: {
    display: 'flex',
    width: '100%',
  },
  clearAllButton: {
    background: 'none',
    border: 'none',
    color: Colors.linkColor,
    fontSize: 12,
    textDecorationLine: 'underline',
    marginLeft: 'auto',
  },
}));

export type WhyLabsAutocompleteProps = Pick<
  AutocompleteProps,
  | 'data'
  | 'icon'
  | 'label'
  | 'limit'
  | 'nothingFound'
  | 'onChange'
  | 'placeholder'
  | 'rightSection'
  | 'value'
  | 'maxDropdownHeight'
> &
  GenericInputProps & {
    labelTooltip?: string;
    clearAllButton?: {
      isHidden?: boolean;
      label: string;
      onClick: () => void;
    };
  };

const WhyLabsAutocomplete = forwardRef<HTMLInputElement, WhyLabsAutocompleteProps>(
  ({ clearAllButton, labelTooltip, maxDropdownHeight = 550, hideLabel, label, ...rest }, ref): JSX.Element => {
    const { classes } = useStyles();
    return (
      <Autocomplete
        classNames={classes}
        data-testid="WhyLabsAutocomplete"
        {...rest}
        aria-label={hideLabel && isString(label) ? label : undefined}
        label={renderLabel()}
        withinPortal
        dropdownComponent="div"
        maxDropdownHeight={maxDropdownHeight}
        radius="sm"
        size="sm"
        ref={ref}
      />
    );

    function renderLabel() {
      return (
        <span className={classes.label}>
          {!hideLabel && (
            <>
              {label}
              {labelTooltip && <HtmlTooltip tooltipContent={labelTooltip} />}
            </>
          )}
          {clearAllButton && !clearAllButton.isHidden && (
            <button className={classes.clearAllButton} onClick={clearAllButton.onClick} type="button">
              {clearAllButton.label}
            </button>
          )}
        </span>
      );
    }
  },
);

export default WhyLabsAutocomplete;

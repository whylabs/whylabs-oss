import { Autocomplete, AutocompleteProps, createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import { isString } from '~/utils/typeGuards';
import { forwardRef } from 'react';

import WhyLabsTooltip from '../tooltip/WhyLabsTooltip';
import { GenericInputProps } from '../types/designSystemTypes';

const useStyles = createStyles(() => ({
  label: {
    display: 'flex',
    width: '100%',
    fontWeight: 600,
  },
  clearAllButton: {
    background: 'none',
    border: 'none',
    color: Colors.linkColor,
    fontSize: 12,
    textDecorationLine: 'underline',
    marginLeft: 'auto',
  },
  rightSection: {
    width: 'auto',
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
  | 'itemComponent'
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
      const labelElement = labelTooltip ? <WhyLabsTooltip label={labelTooltip}>{label}</WhyLabsTooltip> : label;
      return (
        <span className={classes.label}>
          {hideLabel ? null : labelElement}
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

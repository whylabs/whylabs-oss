import { BaseSelectProps, Box, SelectItem } from '@mantine/core';
import { SelectSharedProps } from '@mantine/core/lib/Select/Select';
import { ReactNode } from 'react';
import { isString } from '~/utils/typeGuards';

import { InputLabelTooltip } from '../tooltip/InputLabelTooltip';
import { TooltipWrapper } from '../tooltip/TooltipWrapper';
import { GenericInputProps } from '../types/designSystemTypes';
import { GenericFlexColumnItem } from './custom-items/GenericFlexColumnItem';
import { useDefaultSelectStyles } from './useDefaultSelectStyles';

const LOADING_MESSAGE = 'Loading...';

type PickedBaseSelectProps = Pick<
  BaseSelectProps,
  | 'aria-label'
  | 'aria-invalid'
  | 'className'
  | 'error'
  | 'label'
  | 'placeholder'
  | 'radius'
  | 'required'
  | 'size'
  | 'style'
  | 'withAsterisk'
>;

type PickedSelectSharedProps<Value> = Pick<
  SelectSharedProps<SelectItem, Value>,
  'data' | 'defaultValue' | 'itemComponent' | 'nothingFound' | 'onChange' | 'value' | 'withinPortal' | 'zIndex'
>;

type BaseProps<Value> = PickedBaseSelectProps & PickedSelectSharedProps<Value>;

export type WhyLabsDefaultSelectProps<Value> = GenericInputProps &
  BaseProps<Value> & {
    clearable?: boolean;
    onDropdownToggle?: (isOpen: boolean) => void;
    searchable?: boolean;
    maxDropdownHeight?: number;
    maxInputHeight?: number;
    dropdownWidth?: number;
    allowFilterByValue?: boolean;
  };

type UseDefaultSelectPropsReturn<Value> = BaseProps<Value> &
  Pick<SelectSharedProps<SelectItem, Value>, 'onDropdownClose' | 'onDropdownOpen'> & {
    clearable?: boolean;
    classNames: ReturnType<typeof useDefaultSelectStyles>['classes'];
    maxDropdownHeight: number;
    renderWrapper: (children: ReactNode) => JSX.Element;
    searchable: boolean;
    dropdownWidth?: number;
    // the below props shouldn't be passed to the component while spreading it
    darkBackground: undefined;
    disabledTooltip: undefined;
    hideLabel: undefined;
    labelTooltip: undefined;
    loading: undefined;
    maxInputHeight: undefined;
    allowFilterByValue: undefined;
  };

export function useDefaultSelectProps<Value>({
  darkBackground,
  disabled,
  disabledTooltip,
  hideLabel,
  label,
  labelTooltip,
  loading,
  nothingFound = 'Nothing found',
  onDropdownToggle,
  placeholder,
  maxDropdownHeight = 550,
  maxInputHeight,
  required,
  searchable = true, // make all select components searchable by default
  zIndex = 1,
  itemComponent = GenericFlexColumnItem,
  dropdownWidth,
  ...rest
}: WhyLabsDefaultSelectProps<Value>): UseDefaultSelectPropsReturn<Value> {
  const { classes } = useDefaultSelectStyles({ darkBackground, maxInputHeight, dropdownWidth });

  return {
    'aria-label': hideLabel && isString(label) ? label : undefined,
    'aria-invalid': !!rest.error,
    classNames: classes,
    label: renderLabel(),
    maxDropdownHeight, // ensure all select components have a common default max height
    nothingFound: getNothingFoundMessage(),
    onDropdownOpen: dropdownToggle(true),
    onDropdownClose: dropdownToggle(false),
    placeholder: getPlaceholder(),
    radius: 'sm',
    searchable,
    size: 'sm',
    withAsterisk: required,
    itemComponent,
    zIndex,
    ...rest,
    renderWrapper: (children: ReactNode) => (
      <TooltipWrapper displayTooltip={disabled} label={disabledTooltip}>
        <Box pos="relative" style={{ width: '100%' }}>
          {children}
        </Box>
      </TooltipWrapper>
    ),
    // the below props shouldn't be passed to the component while spreading it
    darkBackground: undefined,
    disabledTooltip: undefined,
    hideLabel: undefined,
    labelTooltip: undefined,
    loading: undefined,
    maxInputHeight: undefined,
    dropdownWidth: undefined,
    allowFilterByValue: undefined,
  };

  function dropdownToggle(isOpen: boolean) {
    return () => {
      onDropdownToggle?.(isOpen);
    };
  }

  function renderLabel() {
    if (hideLabel) return undefined;

    if (labelTooltip) return <InputLabelTooltip label={labelTooltip}>{label}</InputLabelTooltip>;

    return label;
  }

  function getNothingFoundMessage() {
    if (loading) return LOADING_MESSAGE;
    return nothingFound;
  }

  function getPlaceholder() {
    if (loading) return LOADING_MESSAGE;
    return placeholder || `Select${label && isString(label) ? ` ${label.toLowerCase()}` : ''}`;
  }
}

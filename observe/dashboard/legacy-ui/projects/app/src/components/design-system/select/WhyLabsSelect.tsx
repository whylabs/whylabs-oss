import { Select, SelectProps } from '@mantine/core';
import { useEffect, useRef } from 'react';
import { useDebouncedState } from '@mantine/hooks';
import { WhyLabsDefaultSelectProps, useDefaultSelectProps } from './useDefaultSelectProps';
import WhyLabsTooltip from '../tooltip/WhyLabsTooltip';

export type WhyLabsSelectProps = Pick<SelectProps, 'allowDeselect' | 'clearable' | 'searchable' | 'styles'> &
  WhyLabsDefaultSelectProps<string | null>;
const WhyLabsSelect = ({ maxInputHeight, value: controlledValue, ...props }: WhyLabsSelectProps): JSX.Element => {
  const {
    itemComponent: ItemComponentProp,
    renderWrapper,
    ...commonSelectProps
  } = useDefaultSelectProps({
    ...props,
    maxInputHeight: maxInputHeight ?? 36,
  });

  // Deconstruct props to apply specific default values when necessary
  const { autoFocus, allowDeselect = false, disabledTooltip, disabled, allowFilterByValue = true, ...rest } = props;
  const inputRef = useRef<HTMLInputElement>(null);
  // we need debounced state here to prevent slowness on typing the search string
  const [filterString, setFilterString] = useDebouncedState<string>('', 150);
  const renderItemComponent: SelectProps['itemComponent'] = ItemComponentProp
    ? (itemProps) => <ItemComponentProp {...itemProps} filterString={filterString} />
    : undefined;

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <WhyLabsTooltip label={disabled ? disabledTooltip || '' : ''}>
      <Select
        // Order of props is important here. The props from `useSelectCommon` need to be spread after the props from `rest`
        {...rest}
        {...commonSelectProps}
        disabled={disabled}
        dropdownComponent="div"
        value={controlledValue}
        allowDeselect={allowDeselect}
        data-testid="WhyLabsSelect"
        itemComponent={renderItemComponent}
        onFocus={({ target }) => target.select()}
        ref={inputRef}
        onSearchChange={setFilterString}
        filter={
          allowFilterByValue
            ? (value, item) => {
                const searchTerm = value.toLowerCase();
                // If the item has a usedOnFilter, we want to search on those values
                const usedOnFilter: string[] = item?.usedOnFilter ? (item.usedOnFilter as string[]) : [];
                if (usedOnFilter.length) {
                  return usedOnFilter.some((filter) => filter.toLowerCase().includes(searchTerm));
                }

                const matchValue = item.value.toLowerCase().includes(searchTerm);
                const matchLabel = item.label ? item.label.toLowerCase().includes(searchTerm) : false;

                return matchValue || matchLabel;
              }
            : undefined
        }
        onDropdownOpen={() => {
          setTimeout(() => {
            if (!controlledValue) return;
            const selectItem = document.getElementById(`item-${controlledValue}`);
            const comboBox = document.querySelector('div[role="listbox"][data-combobox-popover]');
            if (comboBox && selectItem && 'offsetTop' in selectItem && 'scrollTo' in comboBox) {
              comboBox.scrollTo(0, selectItem.offsetTop - 5);
            }
          }, 0);
        }}
      />
    </WhyLabsTooltip>
  );

  // if (disabledTooltip && disabled) {
  //   return <WhyLabsTooltip label={disabledTooltip}>{SelectComponent}</WhyLabsTooltip>;
  // }
  // return SelectComponent;
};

export default WhyLabsSelect;

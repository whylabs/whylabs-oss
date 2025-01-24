import {
  Box,
  CloseButton,
  MultiSelect,
  MultiSelectProps,
  MultiSelectValueProps,
  SelectProps,
  createStyles,
} from '@mantine/core';
import { useDebouncedState, useResizeObserver } from '@mantine/hooks';
import { forwardRef, useEffect } from 'react';

import { Colors } from '@whylabs/observatory-lib';
import WhyLabsTooltip from '../tooltip/WhyLabsTooltip';
import { WhyLabsDefaultSelectProps, useDefaultSelectProps } from './useDefaultSelectProps';
import { LabelWithLineBreak } from './custom-items/LabelWithLineBreak';

export const MULTI_SELECT_CLOSE_ICON_COLOR = Colors.brandSecondary500;

const MULTISELECT_DEFAULT_OFFSET = 50;

type CustomValueProps = MultiSelectValueProps & { value: string; inputWidth?: number };

export type ConcatenationTokenPosition = 'between' | 'afterEach';
export type ConcatenationToken = {
  position: ConcatenationTokenPosition;
  token: string;
};

export type WhyLabsMultiSelectProps = Pick<
  MultiSelectProps,
  | 'clearable'
  | 'searchable'
  | 'withinPortal'
  | 'icon'
  | 'rightSection'
  | 'styles'
  | 'onFocus'
  | 'onBlur'
  | 'onSearchChange'
  | 'searchValue'
> &
  WhyLabsDefaultSelectProps<string[]> & {
    concatenationToken?: ConcatenationToken;
  };

const useValueStyles = createStyles(
  (_, { concatenationToken }: Pick<WhyLabsMultiSelectProps, 'concatenationToken'>) => {
    const input = {
      paddingLeft: 6,

      '& button': {
        color: MULTI_SELECT_CLOSE_ICON_COLOR,
      },
    };
    const commonStyle = {
      alignItems: 'center',
      display: 'flex',
      gap: 6,
      overflow: 'hidden',

      '& *': {
        fontFamily: 'Inconsolata',
      },
    };
    if (!concatenationToken) return { value: commonStyle, input };

    const cssRule = concatenationToken.position === 'afterEach' ? '' : `:not(:last-of-type)`;
    return {
      value: {
        ...commonStyle,
        margin: '3px',
        [`&${cssRule}::after`]: {
          alignItems: 'center',
          background: Colors.brandSecondary100,
          borderRadius: '0.25rem',
          color: Colors.gray900,
          content: `'${concatenationToken.token}'`,
          display: 'flex',
          fontSize: '12px',
          height: 22,
          padding: '0px 10px',
        },
      },
      input,
    };
  },
);
const CustomValue = ({ inputWidth = 0, value, label, onRemove, classNames, ...rest }: CustomValueProps) => {
  const [ref, rect] = useResizeObserver();
  return (
    <div {...rest} ref={ref}>
      <WhyLabsTooltip label={rect.width > inputWidth - MULTISELECT_DEFAULT_OFFSET ? label : ''}>
        <Box
          sx={() => ({
            display: 'flex',
            cursor: 'default',
            maxWidth: '100%',
            alignItems: 'center',
            backgroundColor: Colors.brandSecondary100,
            paddingLeft: 10,
            borderRadius: 4,
          })}
        >
          <Box
            sx={() => ({
              lineHeight: 1.55,
              fontSize: 12,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: Colors.gray900,
            })}
          >
            {label}
          </Box>
          <CloseButton onMouseDown={onRemove} variant="transparent" size={22} iconSize={14} tabIndex={-1} />
        </Box>
      </WhyLabsTooltip>
    </div>
  );
};

const WhyLabsMultiSelect = forwardRef<HTMLInputElement, WhyLabsMultiSelectProps>(
  ({ concatenationToken, ...props }, ref) => {
    const { renderWrapper, classNames, ...commonSelectProps } = useDefaultSelectProps(props);
    // Deconstruct props to apply specific default values when necessary
    const { autoFocus, withinPortal = true, allowFilterByValue = true, onSearchChange, value, ...rest } = props;
    const [inputRef, rect] = useResizeObserver();
    // we need debounced state here to prevent slowness on typing the search string
    const [filterString, setFilterString] = useDebouncedState<string>('', 150);
    const { classes, cx } = useValueStyles({ concatenationToken });

    const renderItemComponent: SelectProps['itemComponent'] = (itemProps) => (
      <LabelWithLineBreak {...itemProps} filterString={filterString} />
    );

    useEffect(() => {
      if (autoFocus) inputRef.current?.focus();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return renderWrapper(
      <div ref={inputRef}>
        <MultiSelect
          // Order of props is important here. The props from `useSelectCommon` need to be spread after the props from `rest`
          {...rest}
          {...commonSelectProps}
          classNames={{
            ...classNames,
            value: cx(classNames.value, classes.value),
            input: cx(classNames.input, classes.input),
          }}
          itemComponent={renderItemComponent}
          data-testid="WhyLabsMultiSelect"
          onSearchChange={(search) => {
            setFilterString(search);
            onSearchChange?.(search);
          }}
          filter={
            allowFilterByValue && value
              ? (searchString, _, item) => {
                  if (value?.includes(item.value)) return false;
                  const searchTerm = searchString.toLowerCase();

                  // If the item has a usedOnFilter, we want to search on those values
                  const usedOnFilter: string[] = item?.usedOnFilter ? (item.usedOnFilter as string[]) : [];
                  if (usedOnFilter.length) {
                    return usedOnFilter.some((filter) => filter.toLowerCase().includes(searchTerm));
                  }

                  const matchValue = !!item.value.toLowerCase().includes(searchTerm);
                  const matchLabel = item.label ? item.label.toLowerCase().includes(searchTerm) : false;

                  return matchValue || matchLabel;
                }
              : undefined
          }
          ref={ref}
          valueComponent={renderValueComponent}
          rightSectionWidth="fit-content"
          withinPortal={withinPortal}
          value={value}
        />
      </div>,
    );

    function renderValueComponent(valueProps: CustomValueProps) {
      return <CustomValue {...valueProps} inputWidth={rect.width} />;
    }
  },
);

export default WhyLabsMultiSelect;

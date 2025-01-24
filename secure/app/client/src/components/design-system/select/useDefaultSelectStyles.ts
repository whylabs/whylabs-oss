import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';

export const useDefaultSelectStyles = createStyles(
  (
    _,
    {
      darkBackground,
      maxInputHeight,
      dropdownWidth,
    }: { darkBackground?: boolean; maxInputHeight?: number; dropdownWidth?: number },
  ) => ({
    dropdown: {
      fontWeight: 500,
      zIndex: '998 !important' as unknown as number,
      whiteSpace: 'nowrap',
      boxShadow: '0px 2px 6px 0px rgba(0,0,0,0.15)',
      width: dropdownWidth ? `${dropdownWidth}px !important` : '',
      left: dropdownWidth ? 'unset !important' : '',
    },
    separatorLabel: {
      color: Colors.secondaryLight700,
      textTransform: 'uppercase',
      '&::after': {
        borderColor: Colors.secondaryLight300,
      },
    },
    label: {
      color: darkBackground ? 'white' : Colors.brandSecondary900,
      fontWeight: 600,
    },
    item: {
      color: Colors.gray900,
      '&[data-selected]': {
        backgroundColor: `${Colors.brandPrimary600} !important`,
        '& mark': {
          backgroundColor: 'transparent',
        },
      },
    },
    wrapper: {
      fontWeight: 500,
      width: '100%',
    },
    root: {
      width: '100%',
      '& [role="combobox"]': {
        width: '100%',
      },
    },
    value: {
      maxWidth: '100%',
    },
    input: {
      ...(darkBackground
        ? {
            backgroundColor: Colors.darkHeader,
            borderColor: Colors.brandSecondary900,
          }
        : {}),
      textOverflow: 'ellipsis',
      height: 'inherit',
      maxHeight: maxInputHeight || 'inherit',
      overflow: 'auto',
      color: darkBackground ? 'white' : Colors.brandSecondary900,
    },
  }),
);

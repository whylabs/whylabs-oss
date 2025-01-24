import { createStyles } from '@mantine/core';
import { Colors } from '@whylabs/observatory-lib';

export const useDefaultSelectStyles = createStyles(
  (_, { darkBackground, maxInputHeight }: { darkBackground?: boolean; maxInputHeight: number | undefined }) => ({
    dropdown: {
      fontWeight: 500,
      zIndex: '998 !important' as unknown as number,
      whiteSpace: 'nowrap',
      webkitBoxShadow: '0px 2px 6px 0px rgba(0,0,0,0.15)',
      MozBoxShadow: '0px 2px 6px 0px rgba(0,0,0,0.15)',
      boxShadow: '0px 2px 6px 0px rgba(0,0,0,0.15)',
    },
    label: {
      color: darkBackground ? 'white' : Colors.secondaryLight900,
      fontWeight: 600,
    },
    item: {
      color: Colors.secondaryLight1000,
      fontWeight: 500,
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
            backgroundColor: Colors.night1,
            color: 'white',
            borderColor: Colors.brandSecondary900,
          }
        : {}),
      textOverflow: 'ellipsis',
      height: 'inherit',
      maxHeight: maxInputHeight || 'inherit',
      overflow: 'auto',
      color: darkBackground ? 'white' : Colors.secondaryLight1000,
      fontWeight: 400,
    },
  }),
);

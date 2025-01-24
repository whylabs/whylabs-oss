import { Colors } from '@whylabs/observatory-lib';
import { createStyles } from '@mantine/core';

export const useControlStyles = createStyles({
  monitorText: {
    width: '100%',
    marginBottom: 16,
  },
  zIndexCorrect: {
    zIndex: 0,
  },
  helperText: {
    color: Colors.grey,
    marginLeft: '0px',
  },
});

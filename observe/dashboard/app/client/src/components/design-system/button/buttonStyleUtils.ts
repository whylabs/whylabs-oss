import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';

export const useCommonButtonStyles = createStyles(() => ({
  gradient: {
    border: 'none',
    background: 'linear-gradient(94.15deg, #EA5B4F -10.2%, #F9C452 102.94%)',
    color: Colors.white,
  },
}));

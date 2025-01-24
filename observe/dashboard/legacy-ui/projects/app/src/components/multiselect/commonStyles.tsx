import { createStyles } from '@mantine/core';
import { Colors } from '@whylabs/observatory-lib';

const useMultiselectCommonStyles = createStyles({
  wrapperPadding: {
    padding: '9px',
  },
  bottomBorder: {
    borderBottom: `1px solid ${Colors.brandSecondary400}`,
  },
  container: {
    overflowY: 'auto',
    height: 'calc(100vh - 380px)',
    display: 'flex',
    flexDirection: 'column',
  },
  checkBox: {
    '& input': {
      '& ~ svg': {
        fill: Colors.brandSecondary600,
      },
      '&:checked ~ svg': {
        fill: Colors.brandPrimary600,
      },
    },
  },
  disabledLink: {
    color: Colors.brandSecondary500,
  },
});

export default useMultiselectCommonStyles;

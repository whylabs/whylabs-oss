import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';

export const useAccessTokensIndexStyle = createStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    maxHeight: '100%',
    overflowY: 'auto',
  },
  blockText: {
    fontSize: 14,
    color: '#000000de',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    padding: 15,
  },
  form: {
    marginTop: 16,
  },
  title: {
    fontWeight: 600,
    fontSize: '16px',
    lineHeight: '24px',
    marginBottom: '16px',
  },
  newAccessTokenInput: {
    backgroundColor: Colors.brandPrimary100,
    height: 36,
    fontSize: 14,
    fontFamily: 'asap',
    padding: '8px 10px',
    border: `1px solid ${Colors.brandSecondary200}`,
    borderRadius: 4,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    flex: 1,

    '&:focus': {
      outline: 'none',
    },
    '&::placeholder': {
      textTransform: 'uppercase',
      color: Colors.brandSecondary400,
      opacity: 1,
    },
  },
  newAccessTokenWrap: {
    position: 'relative',
    display: 'flex',

    '& button': {
      borderTopLeftRadius: 0,
      borderBottomLeftRadius: 0,
    },
  },
  bulletPoint: {
    margin: '0 15px',
  },
  tokenHelperTextWrapper: {
    margin: '5px 0',
  },
});

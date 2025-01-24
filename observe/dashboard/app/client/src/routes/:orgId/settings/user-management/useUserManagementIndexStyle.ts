import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';

const HEADER_HEIGHT = 175;
const CONTROLS_HEIGHT = 90;

export const useUserManagementIndexStyle = createStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    maxHeight: '100%',
    overflowY: 'auto',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    padding: 15,
  },
  controlsRoot: {
    alignItems: 'center',
    display: 'flex',
    padding: 15,
    height: CONTROLS_HEIGHT,
    overflow: 'hidden',
  },
  controlsScrollableContainer: {
    display: 'flex',
    flexDirection: 'row',
    gap: 15,
    overflow: 'auto',
  },
  tableRoot: {
    display: 'flex',
    height: `calc(100% - ${HEADER_HEIGHT}px - ${CONTROLS_HEIGHT}px)`,
  },
  inputEmailContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    width: 440,
  },
  inputEmail: {
    width: '100%',
  },
  contentSide: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  title: {
    fontFamily: 'Asap',
    fontWeight: 600,
    fontSize: '16px',
    lineHeight: '24px',
    marginBottom: '16px',
  },
  table: {
    '& thead': {
      backgroundColor: Colors.brandSecondary100,
      '& th': {
        fontWeight: 600,
      },
    },
    '& th:first-of-type': {
      paddingLeft: 14,
    },
  },
  limitAlert: {
    marginTop: 25,
  },
  dialogText: {
    fontSize: 14,
    fontFamily: 'Asap',
    color: Colors.secondaryLight1000,
    marginBottom: '16px',

    '& strong': {
      fontWeight: 600,
    },
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    '& small': { fontWeight: 300, fontSize: 12 },
  },
  formRow: {
    display: 'flex',
    gap: 16,
  },
  buttonContainer: {
    paddingTop: 20,
  },
});

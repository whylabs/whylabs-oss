import { PageType } from 'pages/page-types/pageType';
import { logOrThrowError } from 'utils/logUtils';
import { createStyles } from '@mantine/core';
import { Colors, Spacings } from '@whylabs/observatory-lib';

export function getSettingsTabTitle(pt: PageType): string {
  switch (pt) {
    case 'notifications':
    case 'notificationAction':
      return 'Notifications';
    case 'accessToken':
      return 'Access Tokens';
    case 'modelSettings':
      return 'Resources';
    case 'userSettings':
      return 'User Management';
    case 'integrationSettings':
      return 'Integrations';
    default:
      return logOrThrowError(`Must define a label to the PageType: ${pt}`);
  }
}

export const userSettingsPageContentStyles = createStyles((theme) => ({
  pageRootWrap: {
    overflowY: 'auto',
    maxHeight: '100%',
    height: '100%',
  },
  pageRoot: {
    display: 'grid',
    fontFamily: 'Asap',
    height: '100%',
    backgroundColor: Colors.white,
    padding: `30px ${Spacings.pageLeftPaddingLarge}px 40px`,
    gridGap: 35,
    gridTemplateColumns: '2fr 3fr',
    '@media (max-width:1250px)': {
      gridTemplateColumns: '1fr',
      gridTemplateRows: 'auto',
      gridGap: 25,
      height: 'auto',
    },
    '& p': {
      fontSize: 14,
    },
  },
  contentSide: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  loader: {
    marginLeft: 8,
  },
  title: {
    fontFamily: 'Asap',
    fontWeight: 600,
    fontSize: '16px',
    lineHeight: '24px',
    marginBottom: '16px',
  },
  selectWrap: {
    // Override SelectAutoComplete component
    '& svg': {
      top: 8,
    },
    maxWidth: 250,
    marginTop: '16px',

    '& input': {
      height: 40,
      padding: '8px 10px',
      boxSizing: 'border-box',
      borderColor: Colors.brandSecondary200,

      '&:hover': {
        borderColor: Colors.brandSecondary400,
      },

      '&:focus': {
        borderColor: Colors.brandPrimary400,
      },
    },
  },
  inputsWrapper: {
    display: 'grid',
    gridTemplateColumns: '3fr 2fr',
    gridGap: 20,
    margin: '16px 0',
  },
  tableSide: {
    maxHeight: '100%',
    display: 'flex',
    flexDirection: 'column',
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
  tableFirstColumn: {
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
  },
  tableItemFirstColumHead: {
    maxWidth: 300,
    width: '100%',
  },
  tableTitle: { margin: '0 0 16px' },
  tableItemText: {
    fontFamily: 'Asap',
    color: Colors.brandSecondary900,
    minWidth: 180,
  },
  tableItemBtn: {
    maxWidth: 70,
  },
  skeletonText: {
    height: '1.7rem',
  },
  skeletonBtn: {
    width: 70,
    height: '2rem',
    margin: 0,
    borderRadius: 4,
  },
  submitBtn: {
    marginTop: 25,
    width: '185px',
    padding: '7px 15px',
    backgroundColor: Colors.yellow,
    border: `1px solid ${Colors.secondaryLight1000}`,
    textTransform: 'none',
    color: Colors.secondaryLight1000,
  },
  limitAlert: {
    marginTop: 25,
  },
  deleteBtn: {
    color: Colors.red,
    border: `1px solid ${Colors.red}`,
    padding: '8px 10px',
    fontSize: 12,
    '& span': {
      lineHeight: '14px',
    },
  },
  dialogTitle: {
    padding: 0,
    fontSize: 16,
    fontWeight: 600,
    color: Colors.secondaryLight1000,
  },
  dialogText: {
    fontSize: 14,
    fontFamily: 'Asap',
    color: Colors.secondaryLight1000,
    marginBottom: theme.spacing.md,
  },
  dialogButton: {
    fontSize: 14,
    fontFamily: 'Asap',
    fontWeight: 600,
    color: Colors.blue,
  },
  dialogButtonCancel: {
    color: Colors.secondaryLight1000,
  },
  textLabel: {
    display: 'inline-block',
    marginBottom: 10,
    fontFamily: 'Asap',
    fontSize: 14,
    fontWeight: 600,
    textTransform: 'none',
    lineHeight: 1,
    color: Colors.secondaryLight1000,
  },
  searchMembersInput: {
    width: 250,
    marginBottom: 12,
  },
  tableContainer: {
    height: '100%',
    minHeight: '420px',
    '@media (max-width:1250px)': {
      height: 'auto',
    },
  },
  inputsTableWrapper: {
    display: 'grid',
    gridTemplateColumns: '3fr 1fr',
    gridGap: 10,
  },
  inputWrapper: {
    display: 'flex',
    flexDirection: 'column',
  },
  inputLabel: {
    marginBottom: 4,
    fontSize: 14,
    fontFamily: 'Asap',
    '& span': {
      fontSize: 12,
    },
  },
  submitBtnSmall: {
    margin: '0 10px 16px',
    padding: '8px 10px',
    fontSize: 12,
    lineHeight: 'initial',
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  grayButton: {
    marginBottom: 16,
    padding: '8px 10px',
    border: `1px solid ${Colors.brandSecondary600}`,
    fontSize: 12,
    color: Colors.brandSecondary600,
    '& span': {
      lineHeight: '14px',
    },
  },
  tableHeaderWrap: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    overflow: 'hidden',
  },
  strong: {
    fontWeight: 600,
  },
}));

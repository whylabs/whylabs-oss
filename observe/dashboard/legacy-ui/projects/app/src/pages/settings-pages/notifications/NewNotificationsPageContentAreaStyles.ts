import { createStyles } from '@mantine/core';
import { Colors } from '@whylabs/observatory-lib';

export const useNewNotificationPageStyles = createStyles(() => ({
  tableWrapper: {
    overflow: 'auto',
    maxHeight: '100%',
  },
  switchWrapper: {
    display: 'flex',
    alignItems: 'center',
    minHeight: 42,
    padding: '0 8px',
  },
  codeTextArea: {
    color: Colors.secondaryLight1000,
    fontFamily: 'Inconsolata',
    fontSize: 14,
    fontWeight: 400,
    lineHeight: 1.42,
  },
  detailsTextArea: {
    maxWidth: 800,
    maxHeight: 400,
    border: `1px solid ${Colors.mantineLightGray}`,
    width: 'max-content',
    borderRadius: 4,
    padding: '10px 16px',
    margin: 0,
    overflow: 'auto',
  },
  webhookPropertiesLabel: {
    color: Colors.brandSecondary900,
    fontSize: 14,
    fontWeight: 600,
  },
  root: {
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    padding: `15px 50px`,
    margin: 0,
    gap: 15,
    th: {
      background: '#EBF2F3 !important',
      border: '0 !important',
    },
    td: {
      border: '0px !important',
      borderBottom: '1px solid #dee2e6 !important',
    },
  },
  tableEmptyState: {
    display: 'flex',
    width: '100%',
    height: '200px',
    justifyContent: 'center',
    alignItems: 'center',
  },
  relatedMonitorsSection: {
    display: 'flex',
    flexDirection: 'column',
    marginTop: '17px',
    gap: '18px',
  },
  bold: {
    fontWeight: 600,
  },
  flexRow: {
    display: 'flex',
    gap: 10,
    alignItems: 'center',
  },
  buttonsContainer: {
    marginLeft: 'auto',
  },
  dataRow: {
    fontFamily: 'Asap,Roboto,sans-serif',
    fontSize: '14px',
    color: Colors.secondaryLight1000,
    width: '100%',
  },
  alignedTopCellPadding: {
    padding: '8px 0',
  },
  cellPadding: {
    padding: '8px',
  },
  linkCell: {
    color: Colors.linkColor,
    fontFamily: 'Asap,Roboto,sans-serif',
    fontSize: '14px',
  },
  monitorsCell: {
    display: 'flex',
    flexDirection: 'column',
    padding: '8px 0',
    minHeight: 42,
  },
  formContainer: {
    display: 'flex',
    gap: '20px',
    width: '90%',
  },
  inputWrapper: {
    wordBreak: 'break-all',
    minWidth: '300px',
    '*': {
      color: Colors.secondaryLight1000,
    },
  },
  inputPadding: {
    padding: '0 8px',
  },
  darkText: {
    color: Colors.secondaryLight1000,
  },
  textInputs: {
    flex: 1,
    fontSize: '14px',
    minWidth: '220px',
  },
  inputDescription: {
    fontFamily: 'Asap,Roboto,sans-serif',
    fontSize: '12px',
    lineHeight: 1,
    fontWeight: 400,
  },
  buttonOrangeGradient: {
    background: 'linear-gradient(94.15deg, #EA5B4F -10.2%, #F9C452 102.94%)',
    border: 'unset',
    color: 'white',
    padding: '8px 17px',
  },
  buttonActionsHeader: {
    placeSelf: 'flex-start',
    marginTop: '21.7px', // height of input label
  },
  searchInput: {
    width: '250px',
    marginTop: '10px',
  },
  tableItemsCount: {
    color: Colors.secondaryLight1000,
    fontWeight: 600,
    fontSize: 16,
    lineHeight: 1.5,
  },
  tableRoot: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    minHeight: '90px',
    backgroundColor: 'white',
    height: '100%',
    position: 'relative',
    overflow: 'auto',
  },
  editButton: {
    width: 60,
  },
}));

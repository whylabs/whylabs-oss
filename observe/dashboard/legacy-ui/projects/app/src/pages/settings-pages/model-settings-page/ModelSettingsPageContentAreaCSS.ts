import { Colors, Spacings } from '@whylabs/observatory-lib';
import { createStyles } from '@mantine/core';

export const useModelSettingsPageContentStyles = createStyles({
  pageRootWrap: {
    overflowY: 'auto',
    maxHeight: '100%',
    height: '100%',
  },
  pageRoot: {
    display: 'grid',
    backgroundColor: Colors.white,
    padding: `30px ${Spacings.pageLeftPaddingLarge}px 40px`,
    gridGap: 20,
    gridTemplateColumns: '1fr',
    '@media (max-width:1250px)': {
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
  },
  title: {
    fontWeight: 600,
    fontFamily: 'Asap',
    fontSize: '16px',
    lineHeight: '24px',
    marginBottom: '16px',
  },
  searchInput: {
    width: 242,
  },

  inputsWrapper: {
    alignItems: 'end',
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
    gridGap: 20,
    margin: '16px 0',
  },
  tableSide: {
    maxHeight: '100%',
    flexGrow: 1,
  },
  tableHeaderWrap: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    overflow: 'hidden',
    marginBottom: 10,
  },
  tableTitle: { margin: '0 0 16px' },
  dialogTitle: {
    padding: 0,
    fontSize: 16,
    fontWeight: 600,
    color: Colors.secondaryLight1000,
  },
  dialogText: {
    fontSize: 14,
    color: Colors.secondaryLight1000,
  },
  dialogButton: {
    fontSize: 14,
    fontWeight: 600,
    color: Colors.blue,
  },
  dialogButtonCancel: {
    color: Colors.secondaryLight1000,
  },
  checkbox: {
    color: Colors.teal,
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
  editingButtonsWrapper: {
    display: 'flex',
    gridGap: 15,
  },
  whyLabsTable: {
    '& tbody tr td': {
      padding: '8px !important',
    },
  },
  whyLabsTableEditing: {
    '& tbody tr td': {
      padding: '0 8px !important',
    },
  },
  link: {
    color: Colors.linkColor,
  },
});

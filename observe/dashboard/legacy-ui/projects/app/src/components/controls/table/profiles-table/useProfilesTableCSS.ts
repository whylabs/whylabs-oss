import { Colors } from '@whylabs/observatory-lib';
import { createStyles, getStylesRef } from '@mantine/core';

const useProfilesTableCSS = createStyles({
  root: {
    width: '100%',
    display: 'grid',
    gridTemplateRows: '1fr auto',
    height: '100%',
  },
  rootCenteredText: {
    backgroundColor: 'white',
    borderLeft: `1px solid ${Colors.brandSecondary200}`,
    borderTop: `1px solid ${Colors.brandSecondary200}`,
    justifyContent: 'center',
    alignItems: 'center',
    '& > *': {
      transform: `translateY(-${84 / 2}px)`,
      color: Colors.brandSecondary700,
    },
  },
  autoWrapper: {
    height: '100%',
    width: '100%',
  },
  singleCell: {
    display: 'flex',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    padding: '4px 18px',
  },
  firstSingleCell: {
    paddingRight: '3px',
  },
  singleCellContent: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    width: '100%',
    height: '100%',
    // reference button with nested selector
    [`&:hover .${getStylesRef('featurePanelButton')}`]: {
      display: 'block',
    },

    '& *': {
      fontFamily: 'Inconsolata',
    },
  },
  alertCellText: {
    color: Colors.red,
    fontWeight: 600,
  },
  buttonText: {
    fontFamily: 'Asap,sans-serif',
    fontSize: '12px',
    color: Colors.secondaryLight900,
  },
  cellHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: '33px',
    height: '33px',
  },
  cellFeatureName: {
    height: '18px',
    margin: '0 0 9px',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    fontFamily: 'Asap,sans-serif',
    marginBottom: 0,
    fontSize: '14px',
    fontWeight: 'bold',
    textOverflow: 'ellipsis',
    cursor: 'pointer',
    color: Colors.secondaryLight1000,
  },
  cellProfileWrap: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    grow: 1,
  },
  cellProfileValue: {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    fontSize: '13px',
    fontFamily: 'Asap,Roboto,sans-serif',
  },
  cellFeatureContent: {
    display: 'flex',
    flexGrow: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    fontSize: '13px',
  },
  cellFeatureRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cellFeatureRowLeft: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '14px',
  },
  cellFeatureLabel: {
    margin: '5px 5px 5px 0',
    height: '25px',
    width: '5px',
  },
  frequentItem: {
    marginRight: '2px',
    maxWidth: '60px',
  },
  columnDataType: {
    textTransform: 'lowercase',
    '&::first-letter': {
      textTransform: 'uppercase',
    },
  },
  higlightedText: {
    backgroundColor: Colors.brandPrimary100,
  },
  featurePanelButton: {
    ref: getStylesRef('featurePanelButton'),
    display: 'none',
    minWidth: '92px',
    '& p': {
      fontSize: '13px',
      whiteSpace: 'nowrap',
    },
  },
  button: {
    textTransform: 'none',
    lineHeight: 1.75,
    padding: '5px 10px',
    backgroundColor: Colors.white,
    fontSize: '12px',
    color: Colors.secondaryLight900,
  },
  fixedTable: {
    borderLeft: 'none',
    '.public_fixedDataTable_horizontalScrollbar .ScrollbarLayout_main': {
      borderLeft: 'none',
    },
  },
  // Row class
  '.public_fixedDataTableRow_main': {
    // remove cell (column) border and prevent transparency
    '& .public_fixedDataTableCell_main': {
      /// / borderRight: 'none',
      backgroundColor: 'white',
    },
    // sliding column shadow liner-gradient
    '& .public_fixedDataTableRow_columnsShadow': {
      background: `linear-gradient(90deg, white, rgba(0,0,0,0))`,
    },
    /// / add border between rows
    // '&:not(.public_fixedDataTable_header) .public_fixedDataTableCell_main': {
    //   borderBottom: `1px solid ${Colors.brandSecondary200}`,
    // },
    // row hover
    '&:hover:not(.public_fixedDataTable_header)': {
      // background
      '& .public_fixedDataTableCell_main': {
        backgroundColor: Colors.brandSecondary100,
      },
      // sliding column shadow liner-gradient
      '& .public_fixedDataTableRow_columnsShadow': {
        background: `linear-gradient(90deg, ${Colors.brandSecondary100}, rgba(0,0,0,0))`,
      },
    },
    // selected row (feature)
    '&.selected_row': {
      position: 'relative',
      '&::after': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        border: `2px solid ${Colors.brandPrimary700}`,
        zIndex: 2,
        pointerEvents: 'none',
      },
      // sliding column shadow liner-gradient
      '& .public_fixedDataTableRow_columnsShadow': {
        background: `linear-gradient(90deg, ${Colors.brandSecondary100}, rgba(0,0,0,0))`,
      },
      // background
      '& .public_fixedDataTableCell_main': {
        backgroundColor: Colors.brandSecondary100,
      },
    },
  },
  notShownText: {
    color: Colors.grey,
    fontStyle: 'italic',
    fontSize: 12,
  },
  buttonLink: {
    fontSize: '1rem',
    fontWeight: 400,
    lineHeight: '1.5',
    background: 'none !important',
    border: 'none',
    padding: '0 !important',
    '&:hover': { background: 'none !important', textDecoration: 'underline', cursor: 'pointer' },
    '&:active': {
      background: 'none !important',
      cursor: 'pointer',
    },
  },
  loadingText: {
    margin: 'auto',
    display: 'flex',
    alignItems: 'end',
  },
});

export default useProfilesTableCSS;

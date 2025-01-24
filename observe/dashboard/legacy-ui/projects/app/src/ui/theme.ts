import { createMuiTheme } from '@material-ui/core';
import { Colors } from '@whylabs/observatory-lib';

const lightTheme = createMuiTheme({
  palette: {
    type: 'light',
    primary: {
      light: Colors.brandPrimary200,
      main: Colors.brandPrimary500,
      dark: Colors.brandPrimary900,
      contrastText: Colors.white,
    },
    secondary: {
      light: Colors.brandSecondary200,
      main: Colors.brandSecondary500,
      dark: Colors.brandSecondary900,
      contrastText: Colors.white,
    },
    text: {
      primary: Colors.textColor,
      secondary: Colors.linkColor,
    },
    warning: {
      main: Colors.warningColor,
    },
    error: {
      main: Colors.red,
    },
    background: {
      paper: Colors.tealBackground,
      default: Colors.brandSecondary200,
    },
    action: {
      active: Colors.brandPrimary700,
    },
  },
  typography: {
    fontFamily: ['Asap', 'sans-serif'].join(','),
    body2: {
      fontSize: '12px',
      lineHeight: '14px',
    },
    button: {
      textTransform: 'none',
    },
  },
  overrides: {
    MuiCard: {
      root: {
        fontFamily: ['Asap', 'sans-serif'].join(','),
        backgroundColor: Colors.white,
        overflow: 'visible',
      },
    },
    MuiFormControlLabel: {
      label: {
        fontSize: 14,
        lineHeight: 1.4,
      },
    },
    MuiFormControl: {
      root: {},
    },
    MuiInputBase: {
      root: {
        '&$disabled': {
          cursor: 'not-allowed',
        },
      },
    },
    MuiRadio: {
      root: {
        paddingTop: 0,
        paddingBottom: 0,
      },
    },
    MuiFormLabel: {
      root: {
        color: Colors.brandSecondary900,
        '&$focused': {
          color: Colors.brandSecondary900,
        },
      },
    },
    MuiCardHeader: {
      root: {
        paddingLeft: 24,
        paddingBottom: 0,
      },
      title: {
        fontFamily: ['Asap', 'sans-serif'].join(','),
        fontSize: 16,
        lineHeight: 16,
        fontWeight: 600,
      },
      action: {
        flex: '1 auto',
        height: 32,
        display: 'flex',
        marginLeft: 'auto',
        marginTop: 'unset',
        marginRight: 'unset',
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
      },
      content: {
        flex: 'unset',
        //   display: 'flex',
        //   flexDirection: 'row',
        //   justifyContent: 'flex-start',
        //   alignItems: 'flex-start',
        //   maxHeight: 32,
        //   minHeight: 32,
      },
    },
    MuiCardContent: {
      root: {
        padding: 0,
        flex: '0 0 auto',
        '&:last-child': {
          paddingBottom: 0,
        },
      },
    },
    MuiTextField: {
      root: {
        fontFamily: ['Asap', 'Roboto', 'sans-serif'].join(','),
        backgroundColor: Colors.white,
      },
    },
    MuiTableContainer: {
      root: {
        backgroundColor: Colors.white,
      },
    },
    MuiTableCell: {
      root: {
        paddingRight: '8px',
        paddingLeft: '4px',
        maxHeight: '42px',
      },
      body: {
        paddingTop: 0,
        paddingBottom: 0,
        height: '42px',
        maxHeight: '42px',
      },
      head: {
        paddingTop: 0,
        paddingBottom: 0,
      },
      stickyHeader: {
        paddingTop: 0,
        paddingBottom: 0,
        fontWeight: 600,
        backgroundColor: Colors.white,
        fontSize: 12,
        lineHeight: 1.67,
        height: '42px',
        minHeight: '42px',
        paddingLeft: '24px',
      },
    },
    MuiTableRow: {
      root: {
        maxHeight: '42px',
        height: '42px',
        minHeight: '42px',
        overflow: 'hidden',
      },
    },
    MuiCheckbox: {
      colorPrimary: {
        color: Colors.brandPrimary900,
        '&$checked': Colors.brandSecondary900,
      },
    },
    MuiListItemIcon: {
      root: {
        marginRight: '8px',
        minWidth: '24px',
      },
    },
  },
});

export { lightTheme };

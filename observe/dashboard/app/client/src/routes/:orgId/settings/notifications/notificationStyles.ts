import { createStyles, getStylesRef } from '@mantine/core';
import { Colors } from '~/assets/Colors';

const HEADER_HEIGHT = 62;
const CONTROLS_HEIGHT = 90;

export const useNewNotificationPageStyles = createStyles({
  newActionRoot: {
    alignItems: 'center',
    backgroundColor: Colors.brandSecondary100,
    display: 'flex',
    height: HEADER_HEIGHT,
    justifyContent: 'space-between',
    padding: 15,
  },
  codeLine: {
    background: Colors.brandSecondary100,
    fontSize: '15px',
    padding: '2px 7px 3px 7px',
    fontFamily: 'Inconsolata',
    color: 'black',
    borderRadius: 4,
    display: 'inline-flex',
    alignItems: 'center',
    fontWeight: 500,
    lineHeight: 1,
    letterSpacing: -0.15,
    margin: '0 2px',
  },
  headerText: {
    color: Colors.secondaryLight1000,
  },
  actionCell: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  actionsGroup: {
    ref: getStylesRef('actionsGroup'),
    visibility: 'hidden',
    display: 'flex',
    gap: 8,
  },
  codeTextArea: {
    color: Colors.secondaryLight1000,
    fontFamily: 'Inconsolata',
    fontSize: 14,
    fontWeight: 400,
    lineHeight: 1.42,
  },
  detailsTextArea: {
    maxWidth: '100%',
    maxHeight: 400,
    border: `1px solid ${Colors.mantineLightGray}`,
    width: 'max-content',
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
    display: 'grid',
    gridTemplateRows: `${HEADER_HEIGHT}px ${CONTROLS_HEIGHT}px auto`,
    position: 'relative',
    height: '100%',
  },
  tableRoot: {
    display: 'flex',
    overflow: 'auto',
  },
  detailsRoot: {
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    padding: `15px 50px`,
    margin: 0,
    gap: 15,
    position: 'relative',
    flex: 1,
  },
  tableEmptyState: {
    display: 'flex',
    width: '100%',
    height: '200px',
    justifyContent: 'center',
    alignItems: 'center',
  },
  table: {
    '&[data-hover] tbody tr:hover': {
      [`& .${getStylesRef('actionsGroup')}`]: {
        visibility: 'visible',
      },
      '& td *': {
        fontWeight: 600,
      },
    },
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
  buttonsContainer: {
    marginLeft: 'auto',
  },
  monitorsCellLink: {
    fontSize: 13,
    textDecoration: 'none',
  },
  formContainer: {
    display: 'flex',
    gap: '20px',
    width: '90%',
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
  header: {
    color: Colors.black,
    whiteSpace: 'nowrap',
  },
  tableItemsCount: {
    color: Colors.secondaryLight1000,
    fontWeight: 700,
    fontSize: 16,
    lineHeight: 1.5,
  },
  editButton: {
    width: 60,
  },
  flexRow: {
    display: 'flex',
    gap: 10,
    alignItems: 'center',
  },
  controlsRoot: {
    alignItems: 'center',
    display: 'flex',
    padding: 15,
    height: CONTROLS_HEIGHT,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  controlsScrollableContainer: {
    display: 'flex',
    flexDirection: 'row',
    gap: 15,
    overflow: 'auto',
  },
  searchInput: {
    width: 240,
  },
  addActionButtonContainer: {
    height: '100%',
    display: 'flex',
    alignItems: 'flex-end',
  },
  dataRow: {
    '& *': {
      lineHeight: 1,
    },
  },
});

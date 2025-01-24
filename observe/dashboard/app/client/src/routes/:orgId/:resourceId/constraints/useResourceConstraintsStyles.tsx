import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';

const DEFAULT_BORDER = `1px solid ${Colors.secondaryLight200}`;

const CHART_AREA_HEIGHT = 462;

export const useResourceConstraintsStyles = createStyles(() => ({
  root: {
    display: 'flex',
    minHeight: '100vh',
  },
  constraintsContainers: {
    background: Colors.white,
  },
  constraintLink: {
    borderBottom: `1px solid ${Colors.brandSecondary200}`,
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'Asap',
    fontSize: 12,
    justifyContent: 'center',
    padding: '8px 16px',
    minHeight: 42,
  },
  constraintName: {
    fontFamily: 'Inconsolata',
    fontSize: 12,
    fontWeight: 300,
  },
  constraintDetails: {
    color: Colors.textColor,
    fontSize: '0.8rem',
    margin: 0,
    marginLeft: 8,
  },
  sidebar: {
    minWidth: '300px',
  },
  main: {
    display: 'grid',
    gridTemplateRows: `${CHART_AREA_HEIGHT}px 1fr`,
    height: '100vh',
    flexGrow: 1,
  },
  resizeBar: {
    minHeight: '100%',
    minWidth: '3px',
    backgroundColor: Colors.secondaryLight200,
    cursor: 'col-resize',
  },
  chartContainer: {
    padding: '0 20px',
  },
  chartTitle: {
    color: Colors.secondaryLight900,
    fontFamily: 'Asap',
    fontSize: 16,
    fontWeight: 400,
  },
  columnButton: {
    fontFamily: 'Asap',
    fontSize: 12,
    fontWeight: 400,
    color: Colors.linkColor,
    backgroundColor: 'unset',
    border: 'unset',
    padding: 'unset',
    cursor: 'pointer',
  },
  chartSubtitle: {
    color: Colors.secondaryLight800,
    fontFamily: 'Asap',
    fontSize: 12,
    fontWeight: 400,
  },
  searchTextContainer: {
    borderBottom: DEFAULT_BORDER,
    padding: '10px 20px',
  },
  sidebarAccordionContent: {
    padding: 5,
  },
  emptyStateContainer: {
    alignItems: 'center',
    display: 'flex',
    height: '100%',
  },
}));

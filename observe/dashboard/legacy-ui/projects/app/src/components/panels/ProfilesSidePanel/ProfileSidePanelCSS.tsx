import { Colors } from '@whylabs/observatory-lib';
import { createStyles } from '@mantine/core';

export const useProfileSidePanelStyles = createStyles(() => ({
  collapsibleRoot: {
    width: 300,
    minWidth: 300,
    maxWidth: 300,
    flexGrow: 1,
  },
  timeseriesButtonContainer: {
    padding: '13px 16px',
  },
  timeseriesButton: {
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: 'Asap, sans-serif',
  },
  collapsibleWrap: {
    width: 300,
    minWidth: 300,
    maxWidth: 300,
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    overflow: 'auto',
    borderTop: `1px solid ${Colors.white}`,
  },
  header: {
    paddingBottom: '20px',
    padding: 10,
  },
  content: {
    padding: 10,
    paddingTop: 0,
  },
  expandableAccordionContent: {
    overflow: 'hidden',
  },
  featureListContent: {
    paddingTop: 0,
    overflow: 'hidden',
  },
  featureListContentWrapper: {
    paddingLeft: 10,
    paddingRight: 10,
    width: '100%',
  },
  autocomplete: {
    paddingBottom: '10px',
  },
  textTitle: {
    fontFamily: 'Asap, sans-serif',
    fontWeight: 600,
    fontSize: '14px',
    color: Colors.secondaryLight1000,
  },
  subtitleText: {
    fontFamily: 'Asap, sans-serif',
    fontWeight: 'normal',
    fontSize: '12px',
    color: Colors.secondaryLight1000,
    textWrap: 'nowrap',
  },
  profileSection: {
    display: 'flex',
    marginTop: '20px',
  },
  colorIndicator: {
    width: '5px',
    marginRight: '5px',
    borderRadius: '2px',
  },
  profileSectionContent: {
    display: 'flex',
    width: '100%',
  },
  profileSectionContainer: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    gap: 10,
  },
  removeButton: {
    position: 'absolute',
    right: 0,
    padding: 0,
    fontWeight: 500,
    fontSize: '13px',
    lineHeight: '15px',
    height: 'min-content',
  },
  wrapAutoComplete: {
    width: '100%',
  },
  removeBox: {
    marginLeft: '5px',
    marginTop: '21.7px',
    width: '33px',
    minWidth: '33px',
    height: '38px',
    padding: 0,
    backgroundColor: Colors.white,
    fontSize: '18px',
  },
  footer: {
    width: '100%',
    display: 'flex',
    justifyContent: 'end',
    paddingTop: '10px',
  },
  closeIcon: {
    fontSize: '18px',
    color: Colors.brandSecondary700,
  },
  disabledButton: {
    opacity: 0.3,
    pointerEvents: 'none',
  },
  featureList: {
    paddingLeft: 0,
    margin: '8px 0',
    listStyle: 'none',
    overflow: 'hidden',
  },
  featureListItem: {
    color: Colors.brandPrimary900,
    marginBottom: '6px',
    fontSize: '14px',
    fontFamily: 'Asap, sans-serif',
    lineHeight: '20px',
  },
  featureListItemHover: {
    cursor: 'pointer',
    '&:hover': {
      textDecoration: 'underline',
    },
  },
  featureListItemSelected: {
    cursor: 'default',
  },
  featureListItemTextSelected: {
    fontWeight: 800,
    paddingRight: 22,
    position: 'relative',
  },
  spaceBetween: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  featureListItemText: {
    color: Colors.brandPrimary900,
    height: 'min-content',
    fontWeight: 500,
    fontSize: '14px',
    fontFamily: 'Asap, sans-serif',
    lineHeight: 1,
    padding: 0,
    whiteSpace: 'nowrap',
  },
  overflowEllipsis: {
    textOverflow: 'ellipsis',
    overflow: 'hidden',
  },
  collapseHeader: {
    width: '100%',
    justifyContent: 'space-between',
  },
  // Custom styles for collapsible section
  featureListSummary: {
    paddingLeft: 10,
    paddingRight: 10,
    paddingTop: 0,
    paddingBottom: 0,
  },
  profilesSummaryRoot: {
    paddingLeft: 10,
    paddingRight: 10,
  },
  profilesDetailsRoot: {
    display: 'flex',
    flexDirection: 'column',
  },
  collapseIcon: {
    marginRight: '3px',
    marginLeft: '3px',
    color: Colors.grey,
  },
  textButton: {
    padding: 0,
    height: 'min-content',
    '&:hover': {
      backgroundColor: 'transparent',
    },
  },
  divider: {
    background: '#dee2e6',
    width: '100%',
    height: '1px',
  },
}));

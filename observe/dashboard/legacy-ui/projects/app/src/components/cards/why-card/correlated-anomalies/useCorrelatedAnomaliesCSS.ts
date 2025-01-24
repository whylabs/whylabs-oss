import { Colors } from '@whylabs/observatory-lib';
import { createStyles } from '@mantine/core';

const useCorrelatedAnomaliesCSS = createStyles((theme) => ({
  profilesSelect: {
    width: 220,
  },
  cardCorrelatedWrap: {
    display: 'flex',
    background: 'white',
    flexDirection: 'column',
    marginBottom: theme.spacing.xs,
    marginRight: theme.spacing.md,
    marginLeft: theme.spacing.md,
    flex: '1 0 auto',
    border: `2px solid ${Colors.brandSecondary200}`,
  },
  headerWrap: {
    padding: 16,
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
  },
  headerCorrelatedTitle: {
    lineHeight: 1,
    fontSize: 16,
    fontWeight: 600,
    color: Colors.brandPrimary900,
    marginBottom: 20,
  },
  headerNoAnomalies: {
    lineHeight: 1,
    fontSize: 16,
    fontWeight: 600,
    textAlign: 'center',
    color: Colors.brandPrimary900,
  },
  headerRow2: {
    display: 'flex',
  },
  headerInputWrap: {
    width: 220,

    minWidth: 220,
  },
  headerCheckboxInputWrap: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    marginLeft: 24,
  },
  headerCheckboxText: {
    fontSize: 14,
    lineHeight: '20px',
    color: Colors.brandSecondary900,
    fontWeight: 'normal',
    whiteSpace: 'nowrap',
  },
  headerColumnTitle: {
    fontSize: 14,
    lineHeight: '20px',
    color: Colors.brandSecondary900,
    fontWeight: 600,
  },
  headerCheckboxesWrap: {
    display: 'flex',
    flexWrap: 'wrap',
    '& > div': {
      marginRight: 16,
    },
  },
  headerCloseButton: {
    padding: 2,
    height: 26,
    marginLeft: 8,
    color: Colors.brandSecondary900,
    boxShadow: `0px 1px 4px rgba(0,0,0,0.05)`,
    borderRadius: 2,
    transition: 'background 250ms',
    '&:active': {
      boxShadow: 'none',
      transform: `scale(0.95, 0.95)`,
    },
    '&:hover': {
      background: Colors.buttonHover,
    },
    '& span': { color: Colors.brandSecondary700 },
  },
  featureAlertSectionTitle: {
    fontSize: 16,
    lineHeight: 2,
    color: Colors.secondaryLight1000,
    padding: 16,
    fontWeight: 400,
  },
  featureAlertSection: {
    borderTop: `2px solid ${Colors.brandSecondary200}`,
    display: 'flex',
    flexDirection: 'column',
  },
  featureAlertSectionBtn: {
    fontSize: 14,
    lineHeight: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    textDecorationLine: 'underline',
    color: Colors.brandPrimary900,
    height: '48px',
  },
  bottomMsgWrap: {
    display: 'flex',
    flexGrow: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    fontSize: 14,
  },
  bottomMsg: {
    fontSize: 16,
    fontWeight: 400,
  },
  outputFeatureNameLink: {
    paddingLeft: 16,
  },
}));

export default useCorrelatedAnomaliesCSS;

import { createStyles } from '@mantine/core';
import { Colors } from '@whylabs/observatory-lib';

export const useSVCardStyles = createStyles((theme) => ({
  tabContainer: {
    display: 'flex',
    flexDirection: 'column',
  },
  longContainerOnFeaturePage: {
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
    marginRight: theme.spacing.md,
    marginLeft: theme.spacing.md,
  },
  longGraphContainer: {
    display: 'flex',
    flexDirection: 'row',
    marginTop: 0,
    marginBottom: 0,
    minHeight: '100%',
  },
  chart: {
    display: 'flex',
    minHeight: 'inherit',
    flexDirection: 'column',
  },
  longGraphMessage: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    fontFamily: 'Asap, sans-serif',
    color: Colors.brandSecondary900,
    fontSize: '14px',
  },
  cardHeader: {
    padding: '16px 16px 0 24px',
  },
  header: {
    fontWeight: 600,
    fontSize: '16px',
    fontFamily: 'Asap, sans-serif',
    display: 'flex',
    flex: 1,
    color: Colors.brandSecondary900,
  },
  unmonitoredHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: '16px 16px 8px 24px',
    fontWeight: 600,
    fontSize: '16px',
    fontFamily: 'Asap, sans-serif',
    display: 'flex',
    alignItems: 'center',
  },
  headerBare: {
    paddingLeft: 0,
    paddingRight: 0,
  },
  graphWrap: {
    padding: '8px 0 0',
  },
  legendItem: {
    justifyContent: 'center',
    margin: ' 0 5px',
    '&:hover': {
      cursor: 'pointer',
      border: `1px solid ${Colors.brandSecondary200}`,
      transform: 'scale(1.05)',
    },
    padding: '0 6px',
  },
  updateCardCommon: {
    margin: 0,
  },
  cardWithAlerts: {
    border: `2px solid ${Colors.red}`,
  },
  updateCardCommonBare: {
    border: 'none',
  },
  LegendItemsWrap: {
    display: 'flex',
    justifyContent: 'center',
  },
  chartTogglerWrap: {
    display: 'flex',
    justifyContent: 'right',
  },
  cardMenuWrap: {
    padding: '10px 5px 0 18px',
  },
}));

import { Colors } from '@whylabs/observatory-lib';
import { createStyles } from '@mantine/core';

const useWhyCardStyles = createStyles({
  card: {
    marginTop: '8px',
  },
  firstCard: {
    marginTop: '16px',
  },
  lastCard: {
    marginTop: '16px',
  },
  cardCommon: {
    display: 'flex',
    flexDirection: 'column',
    marginBottom: '8px',
    marginRight: '16px',
    marginLeft: '16px',
    flex: '1 0 auto',
    border: `2px solid ${Colors.brandSecondary200}`,
    minHeight: '260px',
    marginTop: 10,
  },
  noBorder: {
    border: 'unset',
  },
  defaultColor: {
    color: Colors.brandSecondary900,
  },
  alertTitleColor: {
    color: Colors.red,
  },
  alertBorder: {
    border: `2px solid ${Colors.red}`,
  },
  adHocTitleColor: {
    color: Colors.chartOrange,
  },
  adHocBorder: {
    border: `2px solid ${Colors.chartOrange}`,
  },
  alert: {
    color: Colors.red,
  },
  adHoc: {
    color: Colors.chartOrange,
  },
  cardDisplay: {
    display: 'flex',
    flexDirection: 'row',
  },
  cardContent: {
    display: 'flex',
    justifyContent: 'center',
    flexDirection: 'column',
    flexGrow: 1,
  },
  cardGraphArea: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: '0 4px',
    flexGrow: 1,
  },
  dividerContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'stretch',
    width: '15px',
    alignSelf: 'stretch',
    alignItems: 'end',
    borderRadius: '4px',
    marginRight: '4px',
    backgroundColor: Colors.brandSecondary100,
    '&:hover': {
      backgroundColor: Colors.brandSecondary200,
    },
  },
  paddingContainer: {
    display: 'flex',
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'stretch',
    padding: '0px 0 36px',
    flex: '0',
  },
  collapsedPaddingContainer: {
    flex: 0,
  },
  combinationGraphArea: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

export default useWhyCardStyles;

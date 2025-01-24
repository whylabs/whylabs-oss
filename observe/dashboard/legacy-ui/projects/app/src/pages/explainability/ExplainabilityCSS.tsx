import { Colors } from '@whylabs/observatory-lib';
import { createStyles } from '@mantine/core';

export const useStyles = createStyles({
  widgetHeader: {
    display: 'flex',
    flexDirection: 'row',
    width: '100%',
    backgroundColor: 'white',
  },
  root: {
    display: 'flex',
    borderLeft: `1px solid ${Colors.brandSecondary200}`,
    paddingLeft: '20px',
    paddingRight: '20px',
  },
  widgetActions: {
    display: 'flex',
    flexDirection: 'row',
  },
  widgetRadio: {
    marginRight: '8px',
    marginBottom: '10px',
  },
  compareDropdown: {
    marginTop: '5px',
    width: '280px',
  },
  sortDropdown: {
    width: '160px',
    marginTop: '5px',
  },
  finalWidget: {
    borderRight: `1px solid ${Colors.brandSecondary200}`,
  },
  explainabilityContainer: {
    fontFamily: 'Asap',
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100%',
    width: '100%',
  },
  pageContainer: {
    display: 'grid',
    width: '100%',
    minHeight: '100%',
  },
  left: {
    '& table': {
      borderRight: `1.5px solid ${Colors.brandSecondary200}`,
    },
  },
  right: {
    '& table': {
      borderLeft: `1.5px solid ${Colors.brandSecondary200}`,
    },
  },
  modelWeightsHeader: {
    fontWeight: 600,
  },
  tooltipRoot: {
    display: 'flex',
    flexDirection: 'column',
    lineHeight: 1.4,
    color: Colors.brandSecondary900,
  },
  tooltipFeatureName: {
    lineHeight: 1.75,
    marginBottom: 1,
    fontWeight: 600,
  },
  flexRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  tooltipModelName: {
    fontWeight: 400,
    lineHeight: 1.75,
  },
  tooltipWeightValue: {
    fontWeight: 600,
  },
  spaceBetween: {
    gap: '8px',
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
  },
});

export const useFeatureWeightsTableStyles = createStyles({
  noDataFound: {
    margin: 'auto',
  },
  table: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    borderTop: `1px solid ${Colors.brandSecondary300}`,
    minHeight: '100%',
    width: '100%',
  },
  tableHeaderWrapper: {
    borderBottom: `1px solid ${Colors.brandSecondary300}`,
    height: '40px',
    backgroundColor: `${Colors.white}`,
  },
  tableHeader: {
    display: 'flex',
    alignItems: 'center',
    height: '40px',
    fontWeight: 600,
    fontSize: '12px',
    padding: '4px 10px',
    borderLeft: `1px solid ${Colors.brandSecondary200}`,
    borderRight: `1px solid ${Colors.brandSecondary200}`,
  },
  featureImportanceTable: {
    width: '100%',
    backgroundColor: `${Colors.white}`,
    borderSpacing: 0,
    borderBottom: `1px solid ${Colors.brandSecondary300}`,
    '& th': {
      borderBottom: `1px solid ${Colors.brandSecondary300}`,
      whiteSpace: 'nowrap',
    },
    '& td, & th': {
      borderRight: `1px solid ${Colors.brandSecondary300}`,
      paddingLeft: 10,
      paddingRight: 10,
      textOverflow: 'ellipsis',
      overflow: 'hidden',
    },
  },
  featureNameCell: {
    minWidth: '100px',
    maxWidth: '160px',
  },
  chartCell: {
    borderRight: 'none !important',
    width: '85%',
  },
  linkCell: {
    textDecoration: 'underline',
  },
  tooltipTextCell: {
    fontSize: '13px',
    fontFamily: 'Inconsolata',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
  },
  tableColumnHeader: {
    fontWeight: 600,
    fontSize: '12px',
    height: '40px',
    textAlign: 'left',
  },
  barChartLegend: {
    display: 'flex',
    justifyContent: 'space-between',
  },
});

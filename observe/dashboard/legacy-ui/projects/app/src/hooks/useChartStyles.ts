import { Colors } from '@whylabs/observatory-lib';
import { AlertData } from 'utils/createAlerts';
import { TOTAL_GRAPH_AREA_HEIGHT, TOTAL_GRAPH_AREA_WIDTH } from 'ui/constants';
import { AnalysisDataFragment } from 'generated/graphql';
import { createStyles } from '@mantine/core';

export const useChartStyles = createStyles({
  flexCenteredDiv: {
    alignSelf: 'center',
    justifySelf: 'center',
    textAlign: 'center',
    height: '100%',
    width: '100%',
  },
  bottomInfo: {
    width: '100%',
    borderTop: `1px solid ${Colors.brandSecondary200}`,
    borderLeft: `1px solid ${Colors.brandSecondary200}`,
  },
  tooltipFlexField: {
    display: 'flex',
    gap: 5,
    justifyContent: 'space-between',
    width: '100%',
  },
  flexRowGraphContainer: {
    height: '100%',
    flex: '0',
  },
  hoverShadow: {
    fill: Colors.transparent,
    '&:hover': {
      fill: Colors.brandSecondary300,
      opacity: 0.3,
    },
  },
  graphContainer: {
    width: TOTAL_GRAPH_AREA_WIDTH,
    height: TOTAL_GRAPH_AREA_HEIGHT,
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginLeft: '8px',
    marginRight: '16px',
    marginBottom: 0,
    marginTop: '8px',
  },
  noGraphContainer: {
    width: TOTAL_GRAPH_AREA_WIDTH,
    height: TOTAL_GRAPH_AREA_HEIGHT,
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: '8px',
    marginRight: '16px',
    marginBottom: 0,
    marginTop: '8px',
  },
  monitorTextContainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    maxHeight: 40,
    minHeight: 40,
    paddingLeft: 64,
    width: '100%',
    fontFamily: ['Asap', 'sans-serif'].join(','),
  },
  flexMonitorTextContainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 24,
    fontFamily: ['Asap', 'sans-serif'].join(','),
  },
  monitorText: {
    fontSize: '12px',
    lineHeight: 1,
    fontFamily: ['Asap', 'sans-serif'].join(','),
    maxHeight: 40,
    color: Colors.brandSecondary900,
    marginTop: 4,
    marginBottom: '8px',
    marginLeft: '8px',
    marginRight: '8px',
  },
  tooltipHeadline: {
    fontSize: 12,
    fontFamily: 'Asap, sans-serif',
    lineHeight: 1.75,
    fontWeight: 600,
    color: Colors.brandSecondary900,
  },
  analysisTooltipBody: {
    fontSize: 12,
    fontFamily: 'Asap, sans-serif',
    lineHeight: 1,
    fontWeight: 'normal',
    color: Colors.brandSecondary900,
  },
  tooltipBody: {
    fontSize: 12,
    fontFamily: 'Asap, sans-serif',
    lineHeight: 1.75,
    fontWeight: 'normal',
    color: Colors.brandSecondary900,
  },
  tooltipSubHeader: {
    fontSize: 12,
    fontFamily: 'Asap, sans-serif',
    lineHeight: 1.75,
    fontWeight: 600,
    color: Colors.brandSecondary900,
  },
  tooltipSquishy: {
    fontSize: 12,
    fontFamily: 'Asap, sans-serif',
    lineHeight: 1.33,
    fontWeight: 'normal',
    color: Colors.brandSecondary900,
  },
  debug: {
    backgroundColor: '#ff000055',
  },
  squishyTooltipBody: {
    fontSize: 12,
    fontFamily: 'Asap, sans-serif',
    lineHeight: 1.33,
    fontWeight: 'normal',
    maxWidth: 300,
    color: Colors.brandSecondary900,
  },
  tooltipError: {
    fontSize: 12,
    fontFamily: 'Asap, sans-serif',
    lineHeight: 1.75,
    fontWeight: 'normal',
    color: Colors.red,
  },
  tooltipSquishyError: {
    fontSize: 12,
    fontFamily: 'Asap, sans-serif',
    lineHeight: 1.33,
    fontWeight: 'normal',
    color: Colors.red,
  },
  tooltipAdHoc: {
    fontSize: 12,
    fontFamily: 'Asap, sans-serif',
    lineHeight: 1.75,
    fontWeight: 'normal',
    maxWidth: 300,
    color: Colors.chartOrange,
  },
  squareLineContainer: {
    height: '12px',
    width: '12px',
    marginLeft: 0,
    marginRight: '8px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  line: {
    height: '1px',
    width: '12px',
    padding: 0,
  },
  longGraphContainer: {
    marginLeft: '8px',
    marginRight: '16px',
    marginBottom: '8px',
    marginTop: '8px',
  },
  squareLine: {
    height: '12px',
    width: '12px',
    paddingTop: '5px',
    paddingBottom: '5px',
    marginLeft: 0,
    marginRight: '8px',
  },
  errorMessage: {
    margin: '0 auto',
    fontFamily: 'Asap, sans-serif',
    color: Colors.brandSecondary900,
    fontSize: '14px',
  },
});

export type ChartStylesOption = 'tooltipBody' | 'squishyTooltipBody' | 'tooltipAdHoc' | 'tooltipError';
export const selectChartStyle = (
  explainedAlert: AlertData | AnalysisDataFragment | undefined,
  adHocRunId: string | undefined,
): ChartStylesOption => {
  if (explainedAlert && 'isFalseAlarm' in explainedAlert && explainedAlert.isFalseAlarm) {
    return 'squishyTooltipBody';
  }
  if (explainedAlert && adHocRunId) {
    return 'tooltipAdHoc';
  }
  if (explainedAlert && 'isAnomaly' in explainedAlert && explainedAlert.isAnomaly) {
    return 'tooltipError';
  }

  return 'tooltipBody';
};

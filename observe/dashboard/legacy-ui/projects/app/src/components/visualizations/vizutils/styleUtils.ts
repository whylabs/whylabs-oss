import { Colors } from '@whylabs/observatory-lib';
import { AnalysisDataFragment } from 'generated/graphql';
import { AlertData } from 'utils/createAlerts';

export const graphTooltipStyles = {
  backgroundColor: '#ffffff',
  border: `1px solid ${Colors.brandSecondary900}`,
  color: Colors.textColor,
  padding: '12px 10px 10px 10px',
  transition: 'all 0.3s ease-out',
  zIndex: 999,
};

export const graphSnappyTooltipStyles = {
  backgroundColor: '#ffffff',
  border: `1px solid ${Colors.brandSecondary900}`,
  color: Colors.textColor,
  padding: '12px 10px 10px 10px',
  zIndex: 999,
};

export const graphTooltipIconStyles = {
  height: '14px',
  width: '14px',
  marginLeft: 0,
  color: Colors.red,
};

export const adHocIconStyles = {
  height: '14px',
  width: '14px',
  marginLeft: 0,
  color: Colors.chartOrange,
};

export const greyIconStyles = {
  height: '14px',
  width: '14px',
  marginLeft: 0,
  color: Colors.grey,
};

export const invisibleIconStyles = {
  height: '14px',
  width: '14px',
  marginLeft: 0,
  color: Colors.transparent,
};

export type ExplainIconStyle = ReturnType<typeof explainIconStyle>;
export const explainIconStyle = (
  explainedAlert: AlertData | AnalysisDataFragment | undefined,
  adHocRunId?: string | undefined,
  invisible?: boolean | undefined,
): typeof greyIconStyles | typeof adHocIconStyles | typeof graphTooltipIconStyles => {
  if (explainedAlert && 'isFalseAlarm' in explainedAlert && explainedAlert.isFalseAlarm) {
    return greyIconStyles;
  }
  if (explainedAlert && adHocRunId) {
    return adHocIconStyles;
  }
  if (invisible || !explainedAlert?.isAnomaly) {
    return invisibleIconStyles;
  }
  return graphTooltipIconStyles;
};

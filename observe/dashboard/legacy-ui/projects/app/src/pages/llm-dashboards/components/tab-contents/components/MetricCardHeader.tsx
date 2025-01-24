import { createStyles } from '@mantine/core';
import { Colors } from '@whylabs/observatory-lib';

import { WhyLabsTypography } from 'components/design-system';
import { AnalysisDataFragment, MetricDataFragment } from 'generated/graphql';
import { MonitorDropdownComponent } from 'components/feature-monitor-dropdown/MonitorDropdownComponent';
import { ACTION_STATE_TAG } from 'types/navTags';
import { useStateUrlEncoder } from 'hooks/useStateUrlEncoder';
import { findDefaultAnalyzer } from '../utils';

const useStyles = createStyles(() => ({
  root: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    width: '100%',
    padding: '8px 20px 8px 0',
  },
  title: {
    color: Colors.brandSecondary900,
    fontFamily: 'Asap, sans-serif',
    fontSize: 16,
    fontWeight: 600,
  },
}));

interface MetricCardHeaderProps {
  analysisResults: AnalysisDataFragment[];
  activeComparison?: boolean;
  metric?: MetricDataFragment | null;
  analyzerId: string | null;
  dispatchAnalyzer: (analyzerId: string) => void;
  isLoading: boolean;
}
export const MetricCardHeader: React.FC<MetricCardHeaderProps> = ({
  analysisResults,
  analyzerId,
  metric,
  activeComparison,
  dispatchAnalyzer,
  isLoading,
}) => {
  const { getAnalysisState } = useStateUrlEncoder();
  const { classes } = useStyles();

  if (!metric) return null;
  if (analyzerId === null && analysisResults?.length) {
    const actionState = getAnalysisState(ACTION_STATE_TAG);
    const defaultAnalyzer = findDefaultAnalyzer(analysisResults, actionState);
    dispatchAnalyzer(defaultAnalyzer);
  }
  const { metadata, name } = metric;
  const changeActiveAnalyzer = (selectedAnalyzer: string | null) => {
    if (selectedAnalyzer) dispatchAnalyzer(selectedAnalyzer);
  };

  const title = metadata?.queryDefinition?.metricLabel ?? name;
  return (
    <div className={classes.root}>
      <WhyLabsTypography className={classes.title}>{title}</WhyLabsTypography>
      <div>
        <MonitorDropdownComponent
          analyzer={analyzerId}
          analysisResults={analysisResults}
          onChange={changeActiveAnalyzer}
          showNotMonitoredWarning
          width={activeComparison ? 180 : 240}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};

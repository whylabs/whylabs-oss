import { ApolloError } from '@apollo/client';
import { AnalysisMetric, GetMissingAnalysisQuery, TimePeriod } from 'generated/graphql';
import { useChartStyles } from 'hooks/useChartStyles';
import { useContext, useState } from 'react';
import { MissingValue } from 'utils/createMissingValues';
import { WhyLabsAutoSizer } from '@whylabs/observatory-lib';

import { WhyCardContext } from 'components/cards/why-card/WhyCardContext';

import { FLEXIBLE_GRAPH_AREA_PADDING, GRAPH_HEIGHT } from 'ui/constants';
import { useStateUrlEncoder } from 'hooks/useStateUrlEncoder';
import { ACTION_STATE_TAG } from 'types/navTags';
import { WhyCardDecorationType } from 'components/cards/why-card/WhyCardTexts';
import { WhyLabsText } from 'components/design-system';
import { AnalysisContext } from 'pages/shared/AnalysisContext';
import { getAnalyzerMetric } from 'utils/schemaUtils';
import { getNoDataMessage } from '../vizutils/cardMessages';
import ThresholdLineVisxChart from './ThresholdLineVisxChart';
import NoDataChart from '../no-data-chart/NoDataChart';

interface ThresholdGraphAreaViewProps {
  valueData: MissingValue[];
  batchFrequency?: TimePeriod;
  anomaliesData?: GetMissingAnalysisQuery;
  totalLoading?: boolean;
  totalError?: ApolloError;
  isCorrelatedAnomalies: boolean;
  manualColumnId?: string;
  columnName: string;
}

const ThresholdGraphAreaView: React.FC<ThresholdGraphAreaViewProps> = ({
  valueData,
  batchFrequency = TimePeriod.P1D,
  anomaliesData = undefined,
  totalLoading = false,
  totalError = false,
  isCorrelatedAnomalies,
  manualColumnId,
  columnName,
}) => {
  const { classes: styles } = useChartStyles();
  const [cardState, cardStateDispatch] = useContext(WhyCardContext);
  const [{ monitorSchema }] = useContext(AnalysisContext);

  const showRatio = !cardState.showDefault;
  const canDrawGraphs = !totalLoading && !totalError;

  const decorationType = showRatio ? 'est_missing_ratios' : 'est_missing_values';
  const [prevShowState, setPrevShowState] = useState<boolean>();
  const { getAnalysisState } = useStateUrlEncoder();
  if (prevShowState !== showRatio) {
    const actionStateDecoration = getAnalysisState(ACTION_STATE_TAG)?.graphDecorationType;
    let updatedDecoration: WhyCardDecorationType = decorationType;
    if (
      !cardState?.decorationType &&
      (actionStateDecoration === 'est_missing_ratios' || actionStateDecoration === 'est_missing_values')
    ) {
      updatedDecoration = actionStateDecoration;
    }
    cardStateDispatch({ decorationType: updatedDecoration });
    setPrevShowState(showRatio);
  }

  const [prevAnalyzer, setPrevAnalyzer] = useState<string>();
  if (prevAnalyzer !== cardState.analyzer) {
    let showDefault = true;
    const firstAnomaly = cardState.analysisResults.find((an) => an.isAnomaly && an.analyzerId === cardState.analyzer);
    if (firstAnomaly) {
      // If the first anomaly is not a count null ratio, show the default graph
      showDefault = firstAnomaly?.metric !== AnalysisMetric.CountNullRatio;
    } else {
      // Check if there is a selected analyzer.
      const analyzerMetric = getAnalyzerMetric(cardState.analyzer, monitorSchema);
      // This string comes from the monitor config, not the graphql, so we can't use the enum.
      showDefault = analyzerMetric !== 'count_null_ratio';
    }

    cardStateDispatch({ showDefault });
    setPrevAnalyzer(cardState.analyzer);
  }

  const renderGraph = () => {
    const noDataMessage = getNoDataMessage(valueData.length, 'missingValues', false, columnName);

    if (noDataMessage) {
      return <NoDataChart noDataMessage={noDataMessage} />;
    }

    return (
      <div style={{ height: '100%', width: '100%' }}>
        <WhyLabsAutoSizer disableHeight>
          {({ width }) => {
            const graphWidth = width - FLEXIBLE_GRAPH_AREA_PADDING;
            return (
              <div style={{ width: graphWidth }}>
                <ThresholdLineVisxChart
                  data={valueData}
                  isCorrelatedAnomalies={isCorrelatedAnomalies}
                  manualColumnId={manualColumnId}
                  width={graphWidth}
                  height={GRAPH_HEIGHT}
                  batchFrequency={batchFrequency}
                  analysis={anomaliesData?.analysisResults?.filter((an) => an.analyzerId === cardState.analyzer)}
                  showRatio={cardState.decorationType === 'est_missing_ratios'}
                />
              </div>
            );
          }}
        </WhyLabsAutoSizer>
      </div>
    );
  };
  return (
    <>
      {totalLoading && (
        <div style={{ alignSelf: 'center', justifySelf: 'center', textAlign: 'center', fontFamily: 'Asap' }}>
          Loading...
        </div>
      )}
      {totalError && (
        <WhyLabsText inherit className={styles.errorMessage}>
          An error occurred while fetching data
        </WhyLabsText>
      )}
      {canDrawGraphs && renderGraph()}
    </>
  );
};

export default ThresholdGraphAreaView;

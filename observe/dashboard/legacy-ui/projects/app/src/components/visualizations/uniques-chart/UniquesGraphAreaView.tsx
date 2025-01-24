import { ApolloError } from '@apollo/client';
import { WhyLabsAutoSizer } from '@whylabs/observatory-lib';
import { WhyCardContext } from 'components/cards/why-card/WhyCardContext';

import { AnalysisMetric, GetUniqueAnalysisQuery, TimePeriod } from 'generated/graphql';
import { useContext, useState } from 'react';
import { DatedUniqueSummary } from 'utils/createDatedUniqueSummaries';
import { FLEXIBLE_GRAPH_AREA_PADDING, GRAPH_HEIGHT } from 'ui/constants';
import { ACTION_STATE_TAG } from 'types/navTags';
import { useStateUrlEncoder } from 'hooks/useStateUrlEncoder';
import { WhyCardDecorationType } from 'components/cards/why-card/WhyCardTexts';
import { AnalysisContext } from 'pages/shared/AnalysisContext';
import { getAnalyzerMetric } from 'utils/schemaUtils';
import { getNoDataMessage } from '../vizutils/cardMessages';
import UniqueRatiosVisxChart from './UniqueRatiosVisxChart';
import UniqueValuesVisxChart from './UniqueValuesVisxChart';
import NoDataChart from '../no-data-chart/NoDataChart';

interface UniquenessGraphAreaViewProps {
  valueData: DatedUniqueSummary[];
  batchFrequency?: TimePeriod;
  anomaliesData?: GetUniqueAnalysisQuery;
  totalLoading?: boolean;
  totalError?: ApolloError;
  isCorrelatedAnomalies: boolean;
  manualColumnId?: string;
  columnName: string;
}

const UniquesGraphAreaView: React.FC<UniquenessGraphAreaViewProps> = ({
  valueData,
  batchFrequency = TimePeriod.P1D,
  anomaliesData = undefined,
  totalLoading,
  totalError,
  isCorrelatedAnomalies,
  manualColumnId,
  columnName,
}) => {
  const [cardState, cardStateDispatch] = useContext(WhyCardContext);
  const [{ monitorSchema }] = useContext(AnalysisContext);
  const showValueChart = cardState.showDefault;
  const decorationType = showValueChart ? 'est_unique_values' : 'est_unique_ratio';
  const [prevShowState, setPrevShowState] = useState<boolean>();
  const { getAnalysisState } = useStateUrlEncoder();
  if (prevShowState !== showValueChart) {
    const actionStateDecoration = getAnalysisState(ACTION_STATE_TAG)?.graphDecorationType;
    let updatedDecoration: WhyCardDecorationType = decorationType;
    if (
      !cardState?.decorationType &&
      (actionStateDecoration === 'est_unique_ratio' || actionStateDecoration === 'est_unique_values')
    ) {
      updatedDecoration = actionStateDecoration;
    }
    cardStateDispatch({ decorationType: updatedDecoration });
    setPrevShowState(showValueChart);
  }
  const [prevAnalyzer, setPrevAnalyzer] = useState<string>();
  if (prevAnalyzer !== cardState.analyzer) {
    let showDefault = true;
    const firstAnomaly = cardState.analysisResults.find((an) => an.isAnomaly && an.analyzerId === cardState.analyzer);
    if (firstAnomaly) {
      showDefault = firstAnomaly.metric !== AnalysisMetric.UniqueEstRatio;
    } else {
      // Check if there is a selected analyzer.
      const analyzerMetric = getAnalyzerMetric(cardState.analyzer, monitorSchema);
      // This string comes from the monitor config, not the graphql, so we can't use the enum.
      showDefault = analyzerMetric !== 'unique_est_ratio';
    }
    cardStateDispatch({ showDefault });
    setPrevAnalyzer(cardState.analyzer);
  }

  const canDraw = !totalLoading && !totalError;

  const commonProps = {
    data: valueData,
    height: GRAPH_HEIGHT,
    batchFrequency,
    isCorrelatedAnomalies,
  };

  const renderGraph = () => {
    const noDataMessage = getNoDataMessage(valueData.length, 'uniques', false, columnName);
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
                {cardState.showDefault === true ? (
                  <UniqueValuesVisxChart
                    {...commonProps}
                    width={graphWidth}
                    decorationCardType={cardState.decorationType}
                    manualColumnId={manualColumnId}
                    anomalies={
                      anomaliesData?.analysisResults?.filter(
                        (an) => an.analyzerId === cardState.analyzer && an.metric === AnalysisMetric.UniqueEst,
                      ) ?? []
                    }
                  />
                ) : (
                  <UniqueRatiosVisxChart
                    {...commonProps}
                    width={graphWidth}
                    manualColumnId={manualColumnId}
                    decorationCardType={cardState.decorationType}
                    anomalies={
                      anomaliesData?.analysisResults?.filter(
                        (an) => an.analyzerId === cardState.analyzer && an.metric === AnalysisMetric.UniqueEstRatio,
                      ) ?? []
                    }
                  />
                )}
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
        <div style={{ alignSelf: 'center', justifySelf: 'center', textAlign: 'center' }}>Loading...</div>
      )}
      {totalError && <div>{totalError.message}</div>}
      {canDraw && renderGraph()}
    </>
  );
};

export default UniquesGraphAreaView;

import { useContext, useEffect, useMemo } from 'react';
import { ApolloError } from '@apollo/client';
import { WhyCardContext } from 'components/cards/why-card/WhyCardContext';
import {
  AnalysisMetric,
  BaselineFieldsFragment,
  FeatureType,
  GetDriftAnalysisQuery,
  ModelCommonDataFragment,
  TimePeriod,
} from 'generated/graphql';
import { useChartStyles } from 'hooks/useChartStyles';
import { createSortedCumulativeFrequents, DatedFrequentItem } from 'utils/createDatedFrequentItems';
import {
  convertNumericQuantileToKeyedQuantile,
  DatedKeyedQuantileSummary,
  DatedQuantileSummary,
} from 'utils/createDatedQuantiles';
import { FLEXIBLE_GRAPH_AREA_PADDING, GRAPH_HEIGHT } from 'ui/constants';
import { CardDataContext } from 'components/cards/why-card/CardDataContext';
import { WhyLabsText } from 'components/design-system';
import { StackedCategoryVxChart } from '../stacked-category-chart';
import { getNoDataMessage, getNoFeatureMessage } from '../vizutils/cardMessages';
import { hasValidQuantileData, hasValidTopFeaturesData } from '../vizutils/dataUtils';
import NoDataChart from '../no-data-chart/NoDataChart';
import QuantileDriftVisxChart from '../quantile-chart/QuantileDriftVisxChart';
import { getGraphWidthSizes } from '../vizutils/graphSizeUtils';

interface DriftGraphAreaViewProps {
  frequentItemsData: DatedFrequentItem[];
  quantileData: DatedQuantileSummary[];
  basicData?: BaselineFieldsFragment | null;
  manualRange?: [number, number];
  batchFrequency?: TimePeriod;
  isOutput?: boolean;
  modelCommonData?: ModelCommonDataFragment;
  featureDoesNotExist?: boolean;
  manualColumnId?: string;
  anomaliesData?: GetDriftAnalysisQuery;
  totalLoading?: boolean;
  totalError?: ApolloError;
  isCorrelatedAnomalies: boolean;
}

const MAX_ITEMS_SHOWN = 5;

const DriftGraphAreaView: React.FC<DriftGraphAreaViewProps> = ({
  quantileData,
  modelCommonData,
  basicData,
  manualRange,
  batchFrequency,
  frequentItemsData,
  featureDoesNotExist,
  manualColumnId,
  anomaliesData,
  totalError,
  totalLoading,
  isCorrelatedAnomalies,
}) => {
  const { classes: styles } = useChartStyles();
  const [cardState, cardStateDispatch] = useContext(WhyCardContext);
  const { setData, cardDataState } = useContext(CardDataContext);

  const legacyData: DatedKeyedQuantileSummary[] = [];
  if (quantileData.length > 0) {
    legacyData.push(...quantileData.map(convertNumericQuantileToKeyedQuantile));
  }

  const histogramEvents = useMemo(() => {
    return (
      anomaliesData?.analysisResults?.filter(
        (an) => an.metric === AnalysisMetric.Histogram && an.analyzerId === cardState.analyzer,
      ) ?? []
    );
  }, [anomaliesData?.analysisResults, cardState.analyzer]);

  const frequentItemEvents = useMemo(() => {
    return (
      anomaliesData?.analysisResults?.filter(
        (an) => an.metric === AnalysisMetric.FrequentItems && an.analyzerId === cardState.analyzer,
      ) ?? []
    );
  }, [anomaliesData?.analysisResults, cardState.analyzer]);

  const usedFeatureName = manualColumnId || basicData?.name || '';
  const renderQuantileGraph = (graphWidth: number, graphHeight: number) => (
    <QuantileDriftVisxChart
      data={legacyData}
      manualColumnId={usedFeatureName}
      alerts={histogramEvents.filter((an) => an.isAnomaly)}
      analysisResults={histogramEvents}
      width={graphWidth}
      height={graphHeight}
      manualRange={manualRange}
      batchFrequency={batchFrequency}
      isCorrelatedAnomalies={isCorrelatedAnomalies}
      unionDataListener={setData}
    />
  );

  // Logic for the stacked category graph.
  const renderStackedCategoryGraph = (graphWidth: number, graphHeight: number) => {
    const sorted = createSortedCumulativeFrequents(frequentItemsData);
    // Note that the splice here alters the `sorted` array, leaving only the
    // unshown cumulative values.
    const shown = sorted.splice(0, Math.min(sorted.length, MAX_ITEMS_SHOWN));
    return (
      <StackedCategoryVxChart
        manualColumnId={usedFeatureName}
        cardType="drift"
        decorationCardType="drift_top_five"
        data={frequentItemsData}
        shownCategories={shown}
        otherCategories={sorted}
        events={frequentItemEvents}
        width={graphWidth}
        height={graphHeight}
        batchFrequency={batchFrequency}
        expandProfile
        isCorrelatedAnomalies={isCorrelatedAnomalies}
        unionDataListener={setData}
      />
    );
  };
  const inferredType = basicData?.schema?.inferredType;

  const canDrawGraphs = !totalLoading && !totalError;

  const shouldDrawQuantiles = cardState.decorationType === 'est_quantile_drift';

  const shouldShowEmpty =
    canDrawGraphs && !hasValidTopFeaturesData(frequentItemsData) && !hasValidQuantileData(legacyData);

  const profilesQuantity = shouldDrawQuantiles ? legacyData.length : frequentItemsData.length;
  useEffect(() => {
    const showingNoData = shouldShowEmpty || featureDoesNotExist || profilesQuantity === 0;
    cardStateDispatch({ showingNoData });
  }, [profilesQuantity, shouldShowEmpty, featureDoesNotExist, cardStateDispatch]);

  const renderGraph = () => {
    const msgKey = inferredType === FeatureType.Unknown ? 'unknownDistribution' : 'distribution';
    const noDataMessage = getNoDataMessage(profilesQuantity, msgKey, shouldShowEmpty, usedFeatureName);

    if (featureDoesNotExist) {
      return (
        <div className={styles.flexCenteredDiv}>
          <NoDataChart noDataMessage={getNoFeatureMessage(manualColumnId, modelCommonData?.name)} />
        </div>
      );
    }

    if (noDataMessage) {
      return (
        <div className={styles.flexCenteredDiv}>
          <NoDataChart noDataMessage={noDataMessage} />
        </div>
      );
    }
    const [visibleWidth] = getGraphWidthSizes(cardState.cardWidth, 4, {
      secondaryGraphOpen: cardDataState.comparisonGraphOpened,
    });
    const graphWidth = visibleWidth - FLEXIBLE_GRAPH_AREA_PADDING / 2;

    return (
      <div id="pendo-distribution-graph" className={styles.flexRowGraphContainer}>
        <div style={{ width: graphWidth, position: 'relative' }}>
          {shouldDrawQuantiles && renderQuantileGraph(graphWidth, GRAPH_HEIGHT)}
          {!shouldDrawQuantiles && renderStackedCategoryGraph(graphWidth, GRAPH_HEIGHT)}
        </div>
      </div>
    );
  };

  return (
    <>
      {totalLoading && <div className={styles.flexCenteredDiv}>Loading...</div>}
      {totalError && (
        <WhyLabsText inherit className={styles.errorMessage}>
          An error occurred while fetching data
        </WhyLabsText>
      )}
      {canDrawGraphs && renderGraph()}
    </>
  );
};

export default DriftGraphAreaView;

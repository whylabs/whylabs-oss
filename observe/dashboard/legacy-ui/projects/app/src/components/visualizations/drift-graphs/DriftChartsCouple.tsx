import { createStyles } from '@mantine/core';
import { WhyLabsAlert, WhyLabsText } from 'components/design-system';
import { Colors, HtmlTooltip } from '@whylabs/observatory-lib';
import { useContext, useEffect, useMemo } from 'react';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { useAdHoc } from 'atoms/adHocAtom';
import { FLEXIBLE_GRAPH_AREA_PADDING } from 'ui/constants';
import { convertNumericQuantileToKeyedQuantile, DatedKeyedQuantileSummary } from 'utils/createDatedQuantiles';
import { useResizeObserver } from '@mantine/hooks';
import { AnalysisMetric, FeatureType } from 'generated/graphql';
import { DatedFrequentItem } from 'utils/createDatedFrequentItems';
import { IconInfoCircle } from '@tabler/icons';
import { WhyCardDecorationType } from 'components/cards/why-card/WhyCardTexts';
import { CollapsedSection } from 'components/cards/why-card/components/collapsed-section/CollapsedSection';
import { WhyCardContext } from 'components/cards/why-card/WhyCardContext';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';
import { ACTION_STATE_TAG } from 'types/navTags';
import { useStateUrlEncoder } from 'hooks/useStateUrlEncoder';
import { GraphAreaCommonProps } from '../vizutils/graphTypes';
import { BatchGraphView } from '../batch-graphs/BatchGraphView';
import { CardCombinationWrapper } from '../../cards/why-card/CardCombinationWrapper';
import { DriftLineVisxChart } from './DriftLineVisxChart';
import { getPageType } from '../vizutils/dataUtils';
import {
  getDriftQueriesByPageType,
  translateBasicData,
  translateFrequentItems,
  translateQuantiles,
} from './driftUtils';
import DriftGraphAreaView from './DriftGraphAreaView';
import NoDataChart from '../no-data-chart/NoDataChart';
import { getNoDataMessage } from '../vizutils/cardMessages';

const useStyles = createStyles(() => ({
  flexColumn: {
    display: 'flex',
    flexDirection: 'column',
    paddingTop: '10px',
    width: '100%',
  },
  alignEnd: {
    alignSelf: 'end',
  },
  loadingWrapper: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    minHeight: '50px',
    width: '100%',
  },
  root: {
    paddingTop: '10px',
    position: 'relative',
    minHeight: '200px',
    display: 'flex',
    flexDirection: 'column',
  },
  chartTitle: {
    padding: '8px 0 0 24px',
    color: Colors.brandSecondary900,
    fontWeight: 600,
  },
  alertWrapper: {
    padding: '0 11px 0 20px',
  },
}));

interface DriftChartsCoupleProps extends GraphAreaCommonProps {
  manualColumnId?: string;
  isOutput?: boolean;
}

const titleMapper = new Map<WhyCardDecorationType, { title: string; tooltip: string }>([
  [
    'drift_top_five',
    {
      title: 'Distribution - frequent items',
      tooltip:
        'A chart showing the top frequent items for this feature over the selected date range. Items outside the top five are grouped into the "Other" category.',
    },
  ],
  [
    'est_quantile_drift',
    {
      title: 'Distribution - estimated quantiles',
      tooltip: 'A chart showing approximate quantiles for this feature over time for the selected date range.',
    },
  ],
]);

export const DriftChartsCouple: React.FC<DriftChartsCoupleProps> = (props) => {
  const { manualColumnId, isOutput = false, setAnalysisResults, isCorrelatedAnomalies } = props;
  const { classes, cx } = useStyles();
  const [whyState] = useContext(WhyCardContext);
  const { title, tooltip } = titleMapper.get(whyState.decorationType) ?? {};
  const { modelId, segment, featureId, outputName } = usePageTypeWithParams();
  const isSegment = !!segment.tags.length;
  const { dateRange, loading: loadingDateRange } = useSuperGlobalDateRange();
  const [adHocRunId] = useAdHoc();
  const featureName = isOutput ? outputName : featureId;
  const usedFeatureName = manualColumnId || featureName;
  const pageType = getPageType(isOutput, isSegment);
  const queries = getDriftQueriesByPageType(pageType);
  const [cardState, cardStateDispatch] = useContext(WhyCardContext);
  const isQuantiles = cardState.decorationType === 'est_quantile_drift';
  const {
    loading: anomaliesLoading,
    data: anomaliesData,
    error: anomaliesError,
  } = queries.getAnalysisData({
    variables: {
      model: modelId,
      feature: usedFeatureName,
      ...dateRange,
      adhocRunId: adHocRunId,
      anomaliesOnly: false,
      tags: segment.tags,
    },
    skip: loadingDateRange,
  });
  const analysisData = anomaliesData?.analysisResults;

  if (analysisData && setAnalysisResults) {
    setAnalysisResults(analysisData);
  }

  const variables = {
    model: modelId,
    feature: usedFeatureName,
    outputName: usedFeatureName,
    ...dateRange,
    adhocRunId: adHocRunId,
    tags: segment.tags,
  };

  const {
    loading: basicDataLoading,
    error: basicDataError,
    data: basicData,
  } = queries.getBasicData({ variables, skip: loadingDateRange });
  const {
    loading: quantilesLoading,
    error: quantilesError,
    data: quantilesData,
  } = queries.getQuantileData({ variables, skip: loadingDateRange });
  const {
    loading: frequentItemsLoading,
    error: frequentItemsError,
    data: frequentItemsData,
  } = queries.getFrequentItemsData({ variables, skip: loadingDateRange });
  const { getAnalysisState } = useStateUrlEncoder();
  const totalLoading =
    anomaliesLoading || basicDataLoading || quantilesLoading || frequentItemsLoading || loadingDateRange;
  const totalError = anomaliesError || basicDataError || quantilesError || frequentItemsError;

  const showEmptyState = !analysisData?.length && !totalLoading;
  const translatedBasicData = useMemo(() => {
    return translateBasicData({ data: basicData, isOutput });
  }, [isOutput, basicData]);

  const translatedQuantiles = useMemo(() => {
    return translateQuantiles({ data: quantilesData, isOutput });
  }, [isOutput, quantilesData]);

  const translatedFrequentItems = useMemo(() => {
    return translateFrequentItems({ data: frequentItemsData, isOutput });
  }, [isOutput, frequentItemsData]);
  const isDiscrete = translatedBasicData?.schema?.isDiscrete;

  if ((translatedBasicData && cardState.isDiscrete !== !!isDiscrete) || cardState.baseline !== translatedBasicData) {
    cardStateDispatch({
      baseline: translatedBasicData,
      isDiscrete,
    });
  }

  useEffect(() => {
    if (isDiscrete !== undefined && !totalLoading) {
      let [hasQuantilesAnomaly, hasFrequentItemsAnomaly] = [false, false];
      analysisData?.forEach((an) => {
        if (an.isAnomaly && an.metric === AnalysisMetric.Histogram) {
          hasQuantilesAnomaly = true;
        }
        if (an.isAnomaly && an.metric === AnalysisMetric.FrequentItems) {
          hasFrequentItemsAnomaly = true;
        }
      });
      const defaultDriftDecoration: WhyCardDecorationType = isDiscrete ? 'drift_top_five' : 'est_quantile_drift';
      const actionStateDecoration = getAnalysisState(ACTION_STATE_TAG)?.graphDecorationType;
      const getDecorationType = () => {
        if (actionStateDecoration === 'drift_top_five' || actionStateDecoration === 'est_quantile_drift') {
          // this comes from URL, for example when navigating from anomalies feed, so we want that monitor to be visible
          return actionStateDecoration;
        }
        if (!hasQuantilesAnomaly && !hasFrequentItemsAnomaly) return defaultDriftDecoration;
        if (defaultDriftDecoration === 'drift_top_five' && !hasFrequentItemsAnomaly && hasQuantilesAnomaly) {
          // if we have anomalies in the other graph and nothing on the default, we can switch it.
          return 'est_quantile_drift';
        }
        if (defaultDriftDecoration === 'est_quantile_drift' && !hasQuantilesAnomaly && hasFrequentItemsAnomaly) {
          // if we have anomalies in the other graph and nothing on the default, we can switch it.
          return 'drift_top_five';
        }
        return defaultDriftDecoration;
      };
      cardStateDispatch({
        decorationType: getDecorationType(),
      });
    }
  }, [analysisData, cardStateDispatch, getAnalysisState, isDiscrete, totalLoading]);

  const renderBottomChart = () => {
    return (
      <DriftGraphAreaView
        frequentItemsData={translatedFrequentItems}
        quantileData={translatedQuantiles}
        basicData={translatedBasicData}
        batchFrequency={basicData?.model?.batchFrequency}
        featureDoesNotExist={translatedBasicData === null}
        manualColumnId={usedFeatureName}
        modelCommonData={basicData?.model ?? undefined}
        anomaliesData={anomaliesData}
        totalLoading={totalLoading}
        totalError={totalError}
        isCorrelatedAnomalies={isCorrelatedAnomalies}
      />
    );
  };
  const [ref, rect] = useResizeObserver();
  const analysisResults = useMemo(() => {
    const usedMetric = isQuantiles ? AnalysisMetric.Histogram : AnalysisMetric.FrequentItems;
    return analysisData?.filter((an) => an.metric === usedMetric && an.analyzerId === cardState.analyzer) ?? [];
  }, [analysisData, cardState.analyzer, isQuantiles]);

  const legacyData = translatedQuantiles.map(convertNumericQuantileToKeyedQuantile);
  const graphWidth = rect.width - FLEXIBLE_GRAPH_AREA_PADDING;
  const inferredType = translatedBasicData?.schema?.inferredType;
  const baseProps = {
    width: graphWidth,
    height: 100,
    analysisResults,
    batchFrequency: basicData?.model?.batchFrequency,
    isCorrelatedAnomalies,
    totalLoading,
    totalError,
    manualColumnId: usedFeatureName,
    inferredType,
  };

  const usedData = isQuantiles ? legacyData : translatedFrequentItems;

  const renderDriftChart = () => (
    <div id="pendo-drift-graph" style={{ height: '100%', width: '100%' }} ref={ref}>
      {isQuantiles ? (
        <DriftLineVisxChart<DatedKeyedQuantileSummary> data={legacyData} {...baseProps} />
      ) : (
        <DriftLineVisxChart<DatedFrequentItem> data={translatedFrequentItems} {...baseProps} />
      )}
    </div>
  );
  const renderEmptyState = () => (
    <div className={classes.alertWrapper}>
      <WhyLabsAlert
        title="Drift chart will be displayed after the monitor has run."
        backgroundColor={Colors.brandSecondary200}
        icon={<IconInfoCircle size={20} />}
      />
    </div>
  );

  if (totalLoading || (analysisData?.length && !cardState.analyzer)) {
    return <div className={classes.loadingWrapper}>Loading...</div>;
  }

  const isUnknown = inferredType === FeatureType.Unknown;
  const totalDataFetched = (usedData?.length ?? 0) + (analysisResults?.length ?? 0);
  if (isUnknown || totalDataFetched === 0) {
    return (
      <NoDataChart
        noDataMessage={getNoDataMessage(
          totalDataFetched,
          isUnknown ? 'unknownDistribution' : 'distribution',
          isUnknown,
          usedFeatureName,
        )}
      />
    );
  }

  return isCorrelatedAnomalies ? (
    renderBottomChart()
  ) : (
    <div className={cx(classes.flexColumn, classes.root)}>
      {showEmptyState ? renderEmptyState() : renderDriftChart()}

      <CardCombinationWrapper
        leftChild={
          <div className={cx(classes.flexColumn, classes.alignEnd)}>
            <WhyLabsText className={classes.chartTitle}>
              {title ?? 'Distribution'}
              {tooltip && <HtmlTooltip tooltipContent={tooltip} />}
            </WhyLabsText>
            {renderBottomChart()}
          </div>
        }
        rightChild={
          <CollapsedSection>
            <BatchGraphView {...props} />
          </CollapsedSection>
        }
      />
    </div>
  );
};

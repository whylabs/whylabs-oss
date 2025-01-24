import { useContext, useEffect, useMemo } from 'react';
import { Skeleton, createStyles } from '@mantine/core';
import { WhyCardContext } from 'components/cards/why-card/WhyCardContext';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';

import {
  FeatureType,
  TimePeriod,
  useGetMergedFeatureDataLazyQuery,
  useGetModelBatchFrequencyQuery,
  useGetRawAnalyzerByIdQuery,
  useGetSegmentSelectedProfilesLazyQuery,
} from 'generated/graphql';
import EmptyHistogram from 'ui/empty-histogram.svg';
import { timeMedium } from 'utils/dateUtils';
import { useDeepCompareEffect } from 'use-deep-compare';
import { WhyLabsTypography } from 'components/design-system';
import { CardDataContext } from 'components/cards/why-card/CardDataContext';
import {
  BATCH_GRAPH_HORIZONTAL_BUFFER,
  calculateTrailingWindowTimestamps,
  generateReferenceRangeDisplayName,
  generateTrailingWindowDisplayName,
  getBaseLineTypeFromPotentialAnalyzer,
  getReferenceProfileIdFromPotentialAnalyzer,
  getTimeRangeFromAnalyzer,
  getTrailingWindowSizeFromAnalyzer,
} from './batchUtils';
import { BatchHistogramView } from './BatchHistogramView';
import { BatchFrequentItemsVisxGraph } from './BatchFrequentItemsVisxGraph';
import { BatchComparisonContext, BatchComparisonContextProvider } from './BatchComparisonContext';
import { BatchProfileToggle } from './BatchProfileToggle';
import { getGraphWidthSizes } from '../vizutils/graphSizeUtils';
import { GraphAreaCommonProps } from '../vizutils/graphTypes';

const useStyles = createStyles({
  graphStack: {
    display: 'flex',
    flexDirection: 'column',
  },
  graphHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    flexDirection: 'row',
    alignItems: 'center',
    height: '30px',
    padding: `0 ${BATCH_GRAPH_HORIZONTAL_BUFFER}px 0 ${BATCH_GRAPH_HORIZONTAL_BUFFER / 2}px`,
  },
  graphHeader: {
    fontFamily: 'Asap, sans-serif',
    fontSize: '16px',
    lineHeight: '16px',
  },
  graphHeaderSlug: {
    height: '30px',
    width: '1px', // Just needs to be nonzero
  },
});

export const BatchGraphView: React.FC<GraphAreaCommonProps> = ({ manualColumnId, isOutput = false }) => {
  const { modelId, segment, featureId, outputName } = usePageTypeWithParams();
  const { data: basicData } = useGetModelBatchFrequencyQuery({ variables: { model: modelId } });
  const featureName = isOutput ? outputName : featureId;
  const [cardState] = useContext(WhyCardContext);
  const { cardDataState } = useContext(CardDataContext);
  const [, histogramDispatch] = useContext(BatchComparisonContext);
  const { data: selectedAnalyzerData, loading: analyzerLoading } = useGetRawAnalyzerByIdQuery({
    variables: { analyzerId: cardState.analyzer, datasetId: modelId },
  });
  const { classes } = useStyles();

  const baselineType = getBaseLineTypeFromPotentialAnalyzer(selectedAnalyzerData?.analyzer ?? '');
  const referenceProfileId =
    baselineType === 'Reference'
      ? getReferenceProfileIdFromPotentialAnalyzer(selectedAnalyzerData?.analyzer ?? '')
      : null;
  const trailingWindowSize =
    baselineType === 'TrailingWindow' ? getTrailingWindowSizeFromAnalyzer(selectedAnalyzerData?.analyzer ?? '') : null;

  const referenceDateRange = useMemo(
    () => (baselineType === 'TimeRange' ? getTimeRangeFromAnalyzer(selectedAnalyzerData?.analyzer ?? '') : null),
    [baselineType, selectedAnalyzerData?.analyzer],
  );

  const batchFrequency = basicData?.model?.batchFrequency ?? TimePeriod.P1D;
  const [trailingWindowFrom, trailingWindowTo] =
    trailingWindowSize !== null && cardDataState.selectedProfile !== null
      ? calculateTrailingWindowTimestamps(Number(cardDataState.selectedProfile), trailingWindowSize, batchFrequency)
      : [null, null];
  const [getSegmentProfiles, { data, error, loading }] = useGetSegmentSelectedProfilesLazyQuery();
  const [getTrailingWindowProfile, { data: trailingWindowProfileData, loading: trailingWindowProfileLoading }] =
    useGetMergedFeatureDataLazyQuery();

  const batchResults = useMemo(() => {
    if (!data?.model?.segment?.batches?.length || !data.model.segment.batches[0].sketches?.results.length) {
      return undefined;
    }
    if (data?.model?.segment?.batches?.length !== 1) {
      return undefined;
    }
    // TODO: handle the case for output features
    return data.model.segment.batches[0].sketches.results[0];
  }, [data]);
  const batchResultsTimestamp = useMemo(() => {
    if (!data?.model?.segment?.batches?.length || !data.model.segment.batches[0].sketches?.results.length) {
      return undefined;
    }
    if (data?.model?.segment?.batches?.length !== 1) {
      return undefined;
    }
    return data.model.segment.batches[0].timestamp;
  }, [data]);
  const getReferenceProfileResults = () => {
    if (
      !data?.model?.segment?.referenceProfiles?.length ||
      !data.model.segment.referenceProfiles[0].sketches?.results.length
    ) {
      return undefined;
    }
    if (data?.model?.segment?.referenceProfiles?.length !== 1) {
      return undefined;
    }
    return data.model.segment.referenceProfiles[0].sketches.results[0];
  };
  const getTrailingWindowProfileResults = () => {
    return trailingWindowProfileData?.dataQueries?.getMergedFeatureData ?? undefined;
  };

  const referenceProfileResults = getReferenceProfileResults();
  const trailingWindowProfileResults = getTrailingWindowProfileResults();
  const referenceProfileDisplayName = data?.model?.segment?.referenceProfiles?.[0]?.alias;
  const trailingWindowDisplayName = generateTrailingWindowDisplayName(trailingWindowSize, batchFrequency);
  const referenceRangeDisplayName = generateReferenceRangeDisplayName(referenceDateRange);
  const baselineDisplayName =
    referenceProfileDisplayName || trailingWindowDisplayName || referenceRangeDisplayName || 'Baseline';

  const inferredDiscreteness: 'non-discrete' | 'discrete' = !cardState.baseline?.schema?.isDiscrete
    ? 'non-discrete'
    : 'discrete';

  useDeepCompareEffect(() => {
    const batchHistogramData = batchResults?.numberSummary?.histogram;
    const referenceHistogramData = referenceProfileResults?.numberSummary?.histogram;
    const trailingWindowHistogramData = trailingWindowProfileResults?.numberSummary?.histogram;
    if (!batchResultsTimestamp) {
      return;
    }
    const histogramTimestamp = batchResultsTimestamp.toFixed(0);
    histogramDispatch({
      type: 'update',
      payload: {
        timestamp: histogramTimestamp,
        target: 'profile',
        targetType: 'raw',
        histogramData: batchHistogramData ?? undefined,
      },
    });
    if (referenceProfileId) {
      histogramDispatch({
        type: 'update',
        payload: {
          timestamp: histogramTimestamp,
          target: 'staticProfile',
          targetType: 'raw',
          histogramData: referenceHistogramData ?? undefined,
        },
      });
    }
    if (trailingWindowSize || referenceDateRange) {
      histogramDispatch({
        type: 'update',
        payload: {
          timestamp: histogramTimestamp,
          target: 'windowBaseline',
          targetType: 'raw',
          histogramData: trailingWindowHistogramData ?? undefined,
        },
      });
    }
  }, [
    referenceDateRange,
    batchResults?.numberSummary?.histogram,
    referenceProfileResults?.numberSummary?.histogram,
    trailingWindowProfileResults?.numberSummary?.histogram,
    referenceProfileId,
    trailingWindowSize,
    batchResultsTimestamp,
  ]);

  useEffect(() => {
    if (cardDataState.selectedProfile) {
      getSegmentProfiles({
        variables: {
          modelId,
          timestamps: [cardDataState.selectedProfile],
          staticProfileIds: referenceProfileId ? [referenceProfileId] : [],
          retrievalTokens: [],
          allowIndividualProfiles: false,
          filter: {
            substrings: [manualColumnId || featureName],
            includeDiscrete: inferredDiscreteness === 'discrete',
            includeNonDiscrete: inferredDiscreteness === 'non-discrete',
          },
          tags: segment.tags,
        },
      });
      // If we have already fetched the unified histogram profile, we don't need to fetch histogram bins without
      // the calculated splitpoints again.
      const hasTrailingWindow = trailingWindowFrom !== null && trailingWindowTo !== null;
      if (hasTrailingWindow || referenceDateRange) {
        getTrailingWindowProfile({
          variables: {
            datasetId: modelId,
            tags: segment.tags,
            column: manualColumnId || featureName,
            from: trailingWindowFrom ?? referenceDateRange?.from ?? 0,
            to: trailingWindowTo ?? referenceDateRange?.to ?? 0,
          },
        });
      }
    }
  }, [
    cardDataState.selectedProfile,
    inferredDiscreteness,
    modelId,
    featureName,
    segment.tags,
    getSegmentProfiles,
    getTrailingWindowProfile,
    manualColumnId,
    referenceProfileId,
    trailingWindowFrom,
    trailingWindowTo,
    referenceDateRange,
  ]);

  const inferredType = cardState.baseline?.schema?.inferredType;
  const canDrawGraphs = !error && !loading && !analyzerLoading && !trailingWindowProfileLoading;
  const numericTypes = new Set<FeatureType | undefined>([FeatureType.Integer, FeatureType.Fraction]);

  const shouldDrawQuantilesDefault = inferredDiscreteness === 'non-discrete' && numericTypes.has(inferredType);
  const shouldDrawQuantiles = cardState.showDefault ? shouldDrawQuantilesDefault : !shouldDrawQuantilesDefault;

  const { selectedProfile } = cardDataState;
  const renderHistograms = (width: number) => {
    return (
      <BatchHistogramView
        datasetId={modelId}
        column={featureName}
        tags={segment.tags}
        trailingWindowFrom={trailingWindowFrom ?? referenceDateRange?.from ?? null}
        trailingWindowTo={trailingWindowTo ?? referenceDateRange?.to ?? null}
        referenceProfileId={referenceProfileId}
        selectedProfile={selectedProfile}
        batchFrequency={batchFrequency}
        batchProfileSketch={batchResults ?? null}
        referenceProfileSketch={referenceProfileResults ?? null}
        trailingWindowProfileSketch={trailingWindowProfileResults ?? null}
        baselineDisplayName={baselineDisplayName}
        noDataUrl={EmptyHistogram}
        metadataLoading={loading || analyzerLoading || trailingWindowProfileLoading}
        useCache={false}
        width={width}
      />
    );
  };

  const renderFrequentItems = (width: number) => {
    return (
      <BatchFrequentItemsVisxGraph
        batchFrequentItems={batchResults}
        batchDisplayName={timeMedium(selectedProfile ?? 0, batchFrequency)}
        referenceFrequentItems={referenceProfileResults ?? trailingWindowProfileResults}
        referenceDisplayName={baselineDisplayName}
        loading={loading || analyzerLoading || trailingWindowProfileLoading}
        graphVerticalBuffer={10}
        graphHorizontalBuffer={BATCH_GRAPH_HORIZONTAL_BUFFER}
        graphHeight={210}
        graphWidth={width}
        noDataImageUrl={EmptyHistogram}
      />
    );
  };

  const renderSlugDiv = () => {
    return <div className={classes.graphHeaderSlug} />;
  };

  const renderHeaderRow = () => {
    if (!cardDataState.selectedProfile) {
      return renderSlugDiv();
    }
    return (
      <div className={classes.graphHeaderRow}>
        <WhyLabsTypography className={classes.graphHeader}>
          Baseline comparison&#58; <strong>{timeMedium(cardDataState.selectedProfile, batchFrequency)}</strong>
        </WhyLabsTypography>
        <BatchProfileToggle />
      </div>
    );
  };
  const [, secondaryGraphWidth] = getGraphWidthSizes(cardState.cardWidth, 4, {
    secondaryGraphOpen: cardDataState.comparisonGraphOpened,
  });
  const renderGraph = () => {
    return (
      <div className={classes.graphStack}>
        {renderHeaderRow()}
        <Skeleton visible={!canDrawGraphs && !!cardDataState.selectedProfile} height={210}>
          {shouldDrawQuantiles ? renderHistograms(secondaryGraphWidth) : renderFrequentItems(secondaryGraphWidth)}
        </Skeleton>
      </div>
    );
  };

  return <BatchComparisonContextProvider>{renderGraph()}</BatchComparisonContextProvider>;
};

import {
  FullSketchFieldsFragment,
  HistogramFieldsFragment,
  SegmentTagFilter,
  TimePeriod,
  useGetFeatureUnifiedBinsLazyQuery,
  useGetMergedFeatureUnifiedDataLazyQuery,
} from 'generated/graphql';
import { useDeepCompareMemo } from 'use-deep-compare';
import { useContext, useState } from 'react';
import { createCommonBinsAsync } from 'utils/createCommonBins';
import { Skeleton } from '@mantine/core';
import { Colors } from '@whylabs/observatory-lib';
import { timeMedium } from 'utils/dateUtils';
import { useDeepCompareEffect } from 'hooks/useDeepCompareEffect';
import { UnifiedHistogramWithMetadata } from '../OverlaidHistograms/types';
import { generateCommonXAxis } from '../inline-histogram/histogramUtils';
import { BatchHistogramVisxGraph } from './BatchHistogramVisxGraph';
import { BatchComparisonContext } from './BatchComparisonContext';

interface BatchHistogramViewProps {
  datasetId: string;
  column: string;
  tags: SegmentTagFilter[];
  batchFrequency: TimePeriod;
  noDataUrl: string;
  selectedProfile: number | null;
  referenceProfileId: string | null;
  batchProfileSketch: FullSketchFieldsFragment | null;
  referenceProfileSketch: FullSketchFieldsFragment | null;
  trailingWindowProfileSketch: FullSketchFieldsFragment | null;
  metadataLoading: boolean;
  trailingWindowFrom: number | null;
  trailingWindowTo: number | null;
  baselineDisplayName: string;
  useCache: boolean;
  width: number;
}

const DEFAULT_BIN_COUNT = 30;

export const BatchHistogramView: React.FC<BatchHistogramViewProps> = ({
  datasetId,
  column,
  tags,
  batchFrequency,
  noDataUrl,
  selectedProfile,
  referenceProfileId,
  batchProfileSketch,
  referenceProfileSketch,
  trailingWindowProfileSketch,
  metadataLoading,
  trailingWindowFrom,
  trailingWindowTo,
  baselineDisplayName,
  useCache,
  width,
}) => {
  const [
    getTrailingWindowUnifiedHistograms,
    { data: trailingUnifiedHistograms, loading: trailingUnifiedHistogramsLoading },
  ] = useGetMergedFeatureUnifiedDataLazyQuery();
  const [commonBins, setCommonBins] = useState<number[] | null>(null);
  const [{ histogramState }, histogramDispatch] = useContext(BatchComparisonContext);

  const [getFeatureUnifiedBins, { data: featureUnifiedBinsData, loading: featureUnifiedBinsLoading }] =
    useGetFeatureUnifiedBinsLazyQuery();

  const pairedHistograms: HistogramFieldsFragment[] = [];
  const selectedProfileString = selectedProfile?.toFixed(0) || '';
  const selectedHistogramData = histogramState.profileHistogramMap.get(selectedProfileString);

  const rawHistograms: HistogramFieldsFragment[] = [];
  // New way to hold the state
  if (selectedHistogramData?.rawProfileHistogram) {
    rawHistograms.push(selectedHistogramData.rawProfileHistogram);
  }
  if (selectedHistogramData?.rawStaticProfileHistogram) {
    rawHistograms.push(selectedHistogramData.rawStaticProfileHistogram);
  }
  if (selectedHistogramData?.rawWindowBaselineHistogram) {
    rawHistograms.push(selectedHistogramData.rawWindowBaselineHistogram);
  }

  // TODO: OLD WAY
  if (batchProfileSketch?.numberSummary?.histogram) {
    pairedHistograms.push(batchProfileSketch.numberSummary.histogram);
  }
  if (referenceProfileSketch?.numberSummary?.histogram) {
    pairedHistograms.push(referenceProfileSketch.numberSummary.histogram);
  }
  if (trailingWindowProfileSketch?.numberSummary?.histogram) {
    pairedHistograms.push(trailingWindowProfileSketch.numberSummary.histogram);
  }

  const commonXDomain = selectedHistogramData
    ? generateCommonXAxis(rawHistograms)
    : generateCommonXAxis(pairedHistograms);

  useDeepCompareEffect(() => {
    if (!commonXDomain.isValid) return;
    async function createCommonBins() {
      const { commonBins: bins } = await createCommonBinsAsync(
        commonXDomain?.min,
        commonXDomain?.max,
        DEFAULT_BIN_COUNT,
      ).catch((e) => {
        console.error('Failed to create common bins in feature panel', e);
        return { commonBins: [] };
      });
      // This is the new way to store the data
      if (useCache) {
        histogramDispatch({
          type: 'standardize',
          payload: { standardizationData: { bins, domain: commonXDomain }, timestamp: selectedProfileString },
        });
      }
      // TODO: remove this once new state is functional
      setCommonBins(bins);
    }
    createCommonBins();
  }, [commonXDomain]);

  // Fetch the unified histograms data
  useDeepCompareEffect(() => {
    if (!selectedProfile || !commonBins || commonBins.length < 2) return;
    const splitpoints = commonBins.slice(1, -1);

    getFeatureUnifiedBins({
      variables: {
        modelId: datasetId,
        featureId: column,
        splitpoints,
        staticProfileIds: referenceProfileId ? [referenceProfileId] : [],
        timestamps: [selectedProfile],
      },
    });

    if (trailingWindowFrom !== null && trailingWindowTo !== null) {
      getTrailingWindowUnifiedHistograms({
        variables: {
          datasetId,
          column,
          from: trailingWindowFrom,
          to: trailingWindowTo,
          tags,
          splitpoints,
        },
      });
    }
  }, [selectedProfile, commonBins]);

  const profileName = selectedProfile !== null ? timeMedium(selectedProfile, batchFrequency) : 'Profile';

  // Now update the cache on change
  useDeepCompareEffect(() => {
    if (!useCache) {
      return;
    }
    const { batches, referenceProfiles } = featureUnifiedBinsData?.model || {};
    if (!batches || batches.length !== 1 || !commonBins || commonBins.length < 2) {
      return;
    }
    const batch = batches[0];
    const { results } = batch.sketches;
    if (results[0]) {
      histogramDispatch({
        type: 'update',
        payload: {
          target: 'profile',
          targetType: 'standardized',
          histogramData: results[0].numberSummary?.histogram ?? undefined,
          timestamp: selectedProfileString,
        },
      });
    }
    if (referenceProfiles && referenceProfiles.length === 1 && referenceProfiles[0].sketches?.results[0]) {
      const referenceResults = referenceProfiles[0].sketches.results[0];
      histogramDispatch({
        type: 'update',
        payload: {
          target: 'staticProfile',
          targetType: 'standardized',
          histogramData: referenceResults?.numberSummary?.histogram ?? undefined,
          timestamp: selectedProfileString,
        },
      });
    }
    if (trailingUnifiedHistograms && trailingUnifiedHistograms?.dataQueries?.getMergedFeatureData) {
      const trailingHistogram = trailingUnifiedHistograms.dataQueries.getMergedFeatureData.numberSummary?.histogram;
      histogramDispatch({
        type: 'update',
        payload: {
          target: 'windowBaseline',
          targetType: 'standardized',
          histogramData: trailingHistogram ?? undefined,
          timestamp: selectedProfileString,
        },
      });
    }
  }, [
    selectedProfileString,
    commonBins,
    trailingUnifiedHistograms,
    featureUnifiedBinsData?.model?.batches,
    featureUnifiedBinsData?.model?.referenceProfiles,
    useCache,
  ]);

  const unifiedHistogramsWithMetadata: UnifiedHistogramWithMetadata[] = useDeepCompareMemo(() => {
    const { batches, referenceProfiles } = featureUnifiedBinsData?.model || {};
    if (!batches || batches.length !== 1 || !commonBins || commonBins.length < 2) {
      return [];
    }
    const updatedUnifiedHistograms: UnifiedHistogramWithMetadata[] = [];

    const batch = batches[0];
    const { results } = batch.sketches;
    const counts = results[0] && results[0].numberSummary?.histogram ? results[0].numberSummary.histogram.counts : [];
    if (counts.length) {
      updatedUnifiedHistograms.push({
        data: { counts, bins: commonBins },
        color: Colors.chartAqua,
        profileNum: 1,
        profileName,
      });
    }
    if (referenceProfiles && referenceProfiles.length === 1) {
      const referenceResults = referenceProfiles[0]?.sketches?.results ?? [];
      updatedUnifiedHistograms.push({
        data: { counts: referenceResults[0]?.numberSummary?.histogram?.counts ?? [], bins: commonBins },
        color: Colors.chartOrange,
        profileNum: 2,
        profileName: baselineDisplayName,
      });
    }
    if (trailingUnifiedHistograms && trailingUnifiedHistograms?.dataQueries?.getMergedFeatureData) {
      const trailingHistogram = trailingUnifiedHistograms.dataQueries.getMergedFeatureData.numberSummary?.histogram;
      if (trailingHistogram) {
        updatedUnifiedHistograms.push({
          data: {
            counts: trailingHistogram.counts,
            bins: trailingHistogram.bins,
          },
          color: Colors.chartOrange,
          profileNum: 2,
          profileName: baselineDisplayName,
        });
      }
    }
    return updatedUnifiedHistograms;
  }, [
    featureUnifiedBinsData?.model,
    trailingUnifiedHistograms,
    commonBins,
    trailingWindowFrom,
    trailingWindowTo,
    batchFrequency,
    baselineDisplayName,
    profileName,
  ]);

  const somethingIsLoading = metadataLoading || featureUnifiedBinsLoading || trailingUnifiedHistogramsLoading;
  const graphIsDrawable =
    !somethingIsLoading &&
    commonXDomain.isValid &&
    unifiedHistogramsWithMetadata.some((h) => h?.data?.bins && h.data.bins.length > 0);

  return (
    <Skeleton visible={selectedProfile !== null && !graphIsDrawable}>
      <BatchHistogramVisxGraph
        histograms={unifiedHistogramsWithMetadata}
        histogramDomain={commonXDomain}
        graphVerticalBuffer={10}
        graphHorizontalBuffer={20}
        graphHeight={210}
        graphWidth={width}
        noDataImageUrl={noDataUrl}
      />
    </Skeleton>
  );
};

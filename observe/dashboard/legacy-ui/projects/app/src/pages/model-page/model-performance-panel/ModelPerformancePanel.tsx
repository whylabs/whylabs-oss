import { useEffect, useState } from 'react';
import {
  GetAnalysisResultsQueryVariables,
  SegmentTag,
  useGetAnalysisResultsQuery,
  useGetModelPerformanceQuery,
  useGetSegmentPerformanceQuery,
} from 'generated/graphql';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import PerformancePanel, { getPerformanceAnomaliesFilterParams } from 'components/panels/performance/PerformancePanel';
import { useLocation } from 'react-router-dom';
import qs from 'query-string';
import { segmentTagsToString } from 'utils/segments';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';
import { useSetHtmlTitle } from 'hooks/useSetHtmlTitle';
import { useSegmentFilter } from '../model-segments/hooks/useSegmentFilter';
import { usePerformancePanelStyles } from './ModelPerformancePanelCSS';

const ModelPerformancePanel: React.FC = () => {
  useSetHtmlTitle('Performance');
  const { modelId, segment } = usePageTypeWithParams();
  const { dateRange, loading: loadingDateRange } = useSuperGlobalDateRange();
  const variables: GetAnalysisResultsQueryVariables = {
    anomaliesOnly: false,
    datasetId: modelId,
    ...dateRange,
    tags: [],
  };

  const { classes: performancePanelStyles } = usePerformancePanelStyles();

  // store the currently selected segment. Default to "null" (overall)
  const [currentSegment, setCurrentSegment] = useState<SegmentTag[] | null>(
    segment?.tags?.length ? segment.tags : null,
  );

  // TODO: we use some metadata info from this query, we should probably fetch that as a separate (smaller)
  //  request and skip this giant data query if it's not needed (eg if the currently selected segment is not "all")
  // fetch performance data for the "overall" segment in the current dataset
  const overallSegmentData = useGetModelPerformanceQuery({
    variables,
    skip: loadingDateRange,
  });

  const { renderFilter } = useSegmentFilter({
    onChange: setCurrentSegment,
    resourceId: modelId,
    selectedSegment: currentSegment ?? [],
  });

  // Fetch comparison model, if one was selected
  const location = useLocation();
  const search = qs.parse(location.search);
  const compareVariables = {
    datasetId: search.compare as string,
    ...dateRange,
  };

  const shouldFetchProjectComparison = !!search.compare;

  const { data: compareData } = useGetModelPerformanceQuery({
    variables: compareVariables,
    skip: !shouldFetchProjectComparison || loadingDateRange,
  });

  const { metricsFilter, columnsFilter } = getPerformanceAnomaliesFilterParams(overallSegmentData);

  // Fetch performance alerts
  const { data: anomaliesData } = useGetAnalysisResultsQuery({
    variables: {
      ...variables,
      tags: currentSegment ?? [],
      metrics: metricsFilter,
      columns: columnsFilter,
    },
    skip: !metricsFilter.length || loadingDateRange, // skip if we don't yet know which metrics to filter anomalies on
  });

  // Fetch data for the currently selected segment, if it's not the "overall"
  const {
    data: currentSegmentData,
    loading: currentSegmentLoading,
    error: currentSegmentError,
  } = useGetSegmentPerformanceQuery({
    variables: { datasetId: variables.datasetId, from: variables.from, to: variables.to, tags: currentSegment },
    skip: !currentSegment || loadingDateRange, // skip if the currently selected segment is the overall/null/all segment - we already fetched it
  });

  // comparison segment
  const [segmentForComparison, setSegmentForComparison] = useState<SegmentTag[] | null>(null);

  const { renderFilter: renderComparisonFilter } = useSegmentFilter({
    onChange: setSegmentForComparison,
    resourceId: compareVariables.datasetId ?? modelId,
    selectedSegment: segmentForComparison ?? [],
  });

  const {
    data: segmentComparisonData,
    loading: segmentComparisonLoading,
    error: segmentComparisonError,
  } = useGetSegmentPerformanceQuery({
    variables: { datasetId: variables.datasetId, from: variables.from, to: variables.to, tags: segmentForComparison },
    skip: segmentForComparison === null || shouldFetchProjectComparison || loadingDateRange, // do not load comparison segment if none was chosen OR if a project was chosen for comparison
  });

  // label to use for the current dataset
  const currentDatasetName =
    // prefer currently selected segment
    (currentSegment && segmentTagsToString(currentSegment)) ??
    // fall back to "Overall dataset" if another segment is selected for comparison
    (segmentForComparison && 'Overall dataset') ??
    // fall back to the dataset's actual name for all other cases
    overallSegmentData.data?.model?.name;

  // currently selected data
  // prefer current segment, fall back to the overall segment
  const currentData = (currentSegment && currentSegmentData?.model?.segment) ?? overallSegmentData.data?.model;

  // label to use for the comparison dataset
  const comparisonDatasetName =
    // prefer comparison model/project, fall back to comparison segment
    (segmentForComparison && segmentTagsToString(segmentForComparison)) ?? compareData?.model?.name ?? undefined;

  // data to use for comparison
  // prefer comparison model/project, fall back to comparison segment
  const comparisonData =
    compareData?.model ?? (segmentForComparison && segmentComparisonData?.model?.segment) ?? undefined;

  // in case the left and right-hand side data is labeled with the same term, this updates the second label
  // otherwise we may encounter React rendering issues
  const dedupeComparisonLabel = (left?: string, right?: string): string | undefined => {
    if (left === right) {
      return `${right} (2)`;
    }

    return right;
  };

  // clear segment comparison if a project is selected for comparison
  // this is because we can only display one or the other at any given time, not both
  useEffect(() => {
    if (shouldFetchProjectComparison) {
      setSegmentForComparison(null);
    }
  }, [segmentForComparison, shouldFetchProjectComparison]);

  const renderSelectors = () => {
    return (
      <div className={performancePanelStyles.headerNoPadding}>
        <div className={performancePanelStyles.segmentSelectionContainer}>{renderFilter({ label: 'Segment' })}</div>
        <div className={performancePanelStyles.segmentSelectionContainer}>
          {renderComparisonFilter({ label: 'Comparison segment' })}
        </div>
      </div>
    );
  };
  return (
    <div className={performancePanelStyles.root}>
      {renderSelectors()}
      <PerformancePanel
        name={currentDatasetName}
        compareName={dedupeComparisonLabel(currentDatasetName, comparisonDatasetName)}
        data={currentData}
        compareData={comparisonData}
        error={overallSegmentData.error || segmentComparisonError || currentSegmentError}
        loading={overallSegmentData.loading || segmentComparisonLoading || currentSegmentLoading}
        batchFrequency={overallSegmentData.data?.model?.batchFrequency}
        modelType={overallSegmentData.data?.model?.modelType}
        anomalies={anomaliesData?.analysisResults}
      />
    </div>
  );
};

export default ModelPerformancePanel;

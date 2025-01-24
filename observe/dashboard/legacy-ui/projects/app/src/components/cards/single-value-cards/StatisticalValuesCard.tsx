import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { createFlexibleDatedQuantiles, convertNumericQuantileToKeyedQuantile } from 'utils/createDatedQuantiles';
import {
  SegmentTagFilter,
  useGetSketchesForSingleValuesCardQuery,
  useGetStatisticalValueAnalysisQuery,
} from 'generated/graphql';
import { useAdHoc } from 'atoms/adHocAtom';
import { useContext } from 'react';
import { AnalysisContext } from 'pages/shared/AnalysisContext';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';
import { SingleValueCard } from './SingleValueCard';
import { generateStatisticalValueQueryVariables } from './createQueryVariables';

interface StatisticalValuesCardProps {
  manualColumnId?: string;
  tags?: SegmentTagFilter[];
  isCorrelatedAnomalies?: boolean;
  isOutput?: boolean;
}
const StatisticalValuesCard: React.FC<StatisticalValuesCardProps> = ({
  manualColumnId,
  tags,
  isCorrelatedAnomalies = false,
  isOutput,
}) => {
  const { dateRange, loading: loadingDateRange } = useSuperGlobalDateRange();
  const { modelId, featureId, outputName, segment } = usePageTypeWithParams();
  const usedColumnName = manualColumnId || featureId || outputName;
  const [{ cardsAnalysisResult }, analysisDispatch] = useContext(AnalysisContext);
  const usedTags = tags || segment.tags;
  const { loading, data, error } = useGetSketchesForSingleValuesCardQuery({
    variables: { modelId, columnName: usedColumnName, tags: usedTags, isOutput, ...dateRange },
    skip: loadingDateRange,
  });

  const [adhocRunId] = useAdHoc();
  const {
    loading: anomaliesLoading,
    data: anomaliesData,
    error: anomaliesError,
  } = useGetStatisticalValueAnalysisQuery({
    variables: {
      ...generateStatisticalValueQueryVariables({
        datasetId: modelId,
        featureId: usedColumnName,
        tags: usedTags,
        dateRange,
        adhocRunId,
      }),
    },
    skip: loadingDateRange,
  });

  const cascadingLoading = loading || anomaliesLoading;
  const cascadingError = error || anomaliesError;
  const mappedData = (() => {
    if (isOutput) return data?.model?.segment?.output?.sketches;
    return data?.model?.segment?.feature?.sketches;
  })();
  const legacyData = [
    ...createFlexibleDatedQuantiles(mappedData ? { sketches: mappedData } : undefined).map(
      convertNumericQuantileToKeyedQuantile,
    ),
  ];
  const analysisResults = anomaliesData?.analysisResults ?? [];
  if (analysisResults.length && cardsAnalysisResult.singleValues?.data !== analysisResults && !isCorrelatedAnomalies) {
    analysisDispatch({
      cardsAnalysisResult: { singleValues: { data: analysisResults } },
    });
  }
  return (
    <SingleValueCard
      sketches={mappedData}
      error={cascadingError}
      legacyData={legacyData}
      loading={cascadingLoading}
      batchFrequency={data?.model?.batchFrequency}
      anomaliesData={anomaliesData}
      isCorrelatedAnomalies={isCorrelatedAnomalies}
      manualColumnId={manualColumnId}
      isOutput={isOutput}
      columnName={usedColumnName}
    />
  );
};

export default StatisticalValuesCard;

import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { useMemo } from 'react';
import { useAdHoc } from 'atoms/adHocAtom';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';
import { getThresholdQueriesByPageType, translateMissingValues } from './threshouldUtils';
import { GraphAreaCommonProps } from '../vizutils/graphTypes';
import ThresholdGraphAreaView from './ThresholdGraphAreaView';
import { getPageType } from '../vizutils/dataUtils';

interface ThresholdGraphAreaProps extends GraphAreaCommonProps {
  manualColumnId?: string;
  isOutput?: boolean;
}

const ThresholdGraphArea: React.FC<ThresholdGraphAreaProps> = ({
  manualColumnId,
  isOutput = false,
  setAnalysisResults,
  isCorrelatedAnomalies,
}) => {
  const { segment } = usePageTypeWithParams();
  const { dateRange, loading: loadingDateRange } = useSuperGlobalDateRange();
  const { modelId, featureId, outputName } = usePageTypeWithParams();
  const featureName = isOutput ? outputName : featureId;
  const [adHocRunId] = useAdHoc();
  const isSegment = !!segment.tags.length;

  const pageType = getPageType(isOutput, isSegment);
  const queries = getThresholdQueriesByPageType(pageType);

  const {
    loading: anomaliesLoading,
    data: anomaliesData,
    error: anomaliesError,
  } = queries.getAnalysisData({
    variables: {
      datasetId: modelId,
      featureId: manualColumnId || featureName,
      anomaliesOnly: false,
      ...dateRange,
      adhocRunId: adHocRunId,
      tags: segment.tags,
    },
    skip: loadingDateRange,
  });

  if (anomaliesData?.analysisResults && setAnalysisResults) {
    setAnalysisResults(anomaliesData?.analysisResults);
  }

  const variables = {
    model: modelId,
    feature: manualColumnId || featureName,
    outputName: manualColumnId || featureName,
    ...dateRange,
    adhocRunId: adHocRunId,
    tags: segment.tags,
  };

  const {
    loading: valueLoading,
    error: valueError,
    data: valueData,
  } = queries.getValueData({ variables, skip: loadingDateRange });

  const totalLoading = anomaliesLoading || valueLoading || loadingDateRange;
  const totalError = anomaliesError || valueError;

  const translatedValueData = useMemo(() => {
    return translateMissingValues({ data: valueData, isOutput, isSegment });
  }, [isOutput, isSegment, valueData]);

  return (
    <ThresholdGraphAreaView
      valueData={translatedValueData}
      manualColumnId={manualColumnId}
      batchFrequency={valueData?.model?.batchFrequency}
      anomaliesData={anomaliesData}
      totalLoading={totalLoading}
      totalError={totalError}
      isCorrelatedAnomalies={isCorrelatedAnomalies}
      columnName={manualColumnId || featureName}
    />
  );
};

export default ThresholdGraphArea;

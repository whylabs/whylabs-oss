import { useMemo } from 'react';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { useGetInferredDataAnalysisQuery } from 'generated/graphql';
import { useAdHoc } from 'atoms/adHocAtom';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';
import { GraphAreaCommonProps } from '../vizutils/graphTypes';
import { getSchemasQueriesByPageType, translateSchemas } from './schemaUtils';
import { getPageType } from '../vizutils/dataUtils';
import SchemaGraphAreaView from './SchemaGraphAreaView';

interface SchemaGraphAreaProps extends GraphAreaCommonProps {
  manualColumnId?: string;
  isOutput?: boolean;
}

const SchemaGraphArea: React.FC<SchemaGraphAreaProps> = ({
  manualColumnId,
  isOutput = false,
  setAnalysisResults,
  isCorrelatedAnomalies,
}) => {
  const { modelId, segment, featureId, outputName } = usePageTypeWithParams();
  const isSegment = !!segment.tags.length;
  const { dateRange, loading: loadingDateRange } = useSuperGlobalDateRange();
  const [adHocRunId] = useAdHoc();
  const featureName = isOutput ? outputName : featureId;
  const pageType = getPageType(isOutput, isSegment);
  const queries = getSchemasQueriesByPageType(pageType);
  const {
    loading: anomaliesLoading,
    data: anomaliesData,
    error: anomaliesError,
  } = useGetInferredDataAnalysisQuery({
    variables: {
      datasetId: modelId,
      featureId: manualColumnId || featureName,
      anomaliesOnly: false,
      ...dateRange,
      tags: segment.tags || [],
      adhocRunId: adHocRunId,
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
    return translateSchemas({ data: valueData, isOutput });
  }, [isOutput, valueData]);

  return (
    <SchemaGraphAreaView
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

export default SchemaGraphArea;

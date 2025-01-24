import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { useContext, useMemo } from 'react';
import { useAdHoc } from 'atoms/adHocAtom';
import { useGetUniqueAnalysisQuery } from 'generated/graphql';
import { WhyCardContext } from 'components/cards/why-card/WhyCardContext';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';
import { GraphAreaCommonProps } from '../vizutils/graphTypes';
import UniquesGraphAreaView from './UniquesGraphAreaView';
import { getPageType } from '../vizutils/dataUtils';

import { getUniquenessSketches, getUniqueValuesQueriesByPageType, translateUniquenessValues } from './uniquesUtils';

const UniquesGraphArea: React.FC<GraphAreaCommonProps> = ({
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
  const [cardState, cardStateDispatch] = useContext(WhyCardContext);
  const pageType = getPageType(isOutput, isSegment);
  const queries = getUniqueValuesQueriesByPageType(pageType);

  const {
    loading: anomaliesLoading,
    data: anomaliesData,
    error: anomaliesError,
  } = useGetUniqueAnalysisQuery({
    variables: {
      datasetId: modelId,
      featureId: manualColumnId || featureName,
      anomaliesOnly: false,
      adhocRunId: adHocRunId,
      ...dateRange,
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
  const { isDiscrete } = getUniquenessSketches({ data: valueData, isOutput });
  const totalLoading = anomaliesLoading || valueLoading;
  const totalError = anomaliesError || valueError;

  if (valueData && cardState.isDiscrete !== !!isDiscrete) {
    cardStateDispatch({
      isDiscrete,
    });
  }

  const translatedValueData = useMemo(() => {
    return translateUniquenessValues({ data: valueData, isOutput });
  }, [isOutput, valueData]);

  return (
    <UniquesGraphAreaView
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

export default UniquesGraphArea;

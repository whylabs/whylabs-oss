import {
  useGetSegmentedSingleOutputBasicDataQuery,
  useGetSegmentedSingleFeatureBasicDataQuery,
} from 'generated/graphql';
import {
  createFeatureBasicDataFromOutputs,
  createFeatureBasicDataFromSegments,
  FeatureBasicData,
} from 'utils/createFeatureBasicData';
import { ApolloError } from '@apollo/client';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';

type UseFeatureBasicDataFastReturnType = {
  readonly loading: boolean;
  readonly error: ApolloError | undefined;
  readonly data: FeatureBasicData;
};

export function useFeatureBasicDataFast(manualColumnId?: string): UseFeatureBasicDataFastReturnType {
  const { dateRange, loading: loadingDateRange } = useSuperGlobalDateRange();
  const pt = usePageTypeWithParams();
  const { modelId, outputName, segment } = pt;
  const { tags } = segment;
  const isOutput = !!outputName;
  const {
    loading: segmentLoading,
    error: segmentError,
    data: segmentData,
  } = useGetSegmentedSingleFeatureBasicDataQuery({
    variables: {
      model: modelId,
      feature: manualColumnId || pt.featureId,
      tags,
      ...dateRange,
    },
    skip: isOutput || loadingDateRange,
  });

  const {
    loading: outputLoading,
    error: outputError,
    data: outputData,
  } = useGetSegmentedSingleOutputBasicDataQuery({
    variables: {
      model: modelId,
      outputName,
      tags,
      ...dateRange,
    },
    skip: !isOutput || loadingDateRange,
  });

  const loading = isOutput ? outputLoading : segmentLoading;
  const error = isOutput ? outputError : segmentError;
  const data = isOutput
    ? createFeatureBasicDataFromOutputs(outputData)
    : createFeatureBasicDataFromSegments(segmentData);

  return { loading, error, data } as const;
}

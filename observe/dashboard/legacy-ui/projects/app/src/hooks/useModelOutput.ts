import { useGetOutputForModelQuery, GetOutputForModelQuery, Exact, Maybe } from 'generated/graphql';
import { QueryResult } from '@apollo/client';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';

type UseModelOutputReturnType = QueryResult<
  GetOutputForModelQuery,
  Exact<{
    model: string;
    from: number;
    to?: Maybe<number> | undefined;
  }>
>;

export function useModelOutput(outputName: string, manualModelId?: string): UseModelOutputReturnType {
  const params = usePageTypeWithParams();
  const { dateRange, loading: loadingDateRange } = useSuperGlobalDateRange();

  return useGetOutputForModelQuery({
    variables: {
      model: manualModelId || params.modelId,
      filter: {
        featureName: outputName,
      },
      ...dateRange,
    },
    skip: loadingDateRange,
  });
}

import { AssetCategory, ModelType, useGetResourceModelTypeQuery } from 'generated/graphql';
import { useRecoilState } from 'recoil';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { resolversCachedData } from './utils';

type ModelTypeResult = {
  modelType?: ModelType | null;
  resourceCategory: AssetCategory | null;
  loading: boolean;
};
export const useFetchModelType = (): ModelTypeResult => {
  const [{ resourceId, cache, loading: cacheLoading }, setCache] = useRecoilState(resolversCachedData);
  const { modelId } = usePageTypeWithParams();
  const skip = !!(modelId === resourceId && cache?.modelTypeData);
  const { data, error } = useGetResourceModelTypeQuery({ variables: { resourceId: modelId }, skip });
  if (!skip && data && data !== cache?.modelTypeData) {
    setCache((curr) => ({ resourceId: modelId, cache: { ...curr.cache, modelTypeData: data }, loading: false }));
  }
  return {
    modelType: cache?.modelTypeData?.resource?.type ?? null,
    resourceCategory: cache?.modelTypeData?.resource?.category ?? null,
    loading: cacheLoading ?? !error,
  };
};

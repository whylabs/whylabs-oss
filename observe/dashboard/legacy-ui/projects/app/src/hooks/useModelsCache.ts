import { atom, useRecoilState } from 'recoil';
import {
  LatestAlertOnModelFragment,
  ModelCommonDataFragment,
  ModelMetricsNameFragment,
  useGetAllModelsQuery,
} from 'generated/graphql';
import { ONE_HOUR_IN_MILLIS } from 'ui/constants';
import { ApolloError } from '@apollo/client';

interface CacheType {
  timestamp?: number;
  data: (ModelCommonDataFragment & LatestAlertOnModelFragment & ModelMetricsNameFragment)[];
}
interface CacheReturnType {
  loading: boolean;
  error: ApolloError | undefined;
  data: (ModelCommonDataFragment & LatestAlertOnModelFragment & ModelMetricsNameFragment)[] | undefined;
}

export const allModelsCacheAtom = atom<CacheType>({
  key: 'getAllModelsCache',
  default: { data: [] },
});

export function useModelsCache(): CacheReturnType {
  const [cached, setCache] = useRecoilState(allModelsCacheAtom);
  const skip =
    cached.data.length > 0 &&
    cached.timestamp !== undefined &&
    new Date().getTime() - cached.timestamp < ONE_HOUR_IN_MILLIS;

  const allModels = useGetAllModelsQuery({
    skip,
  });

  if (!skip) {
    if (allModels.data?.models !== undefined && allModels.data?.models.length > 0) {
      setCache({
        timestamp: new Date().getTime(),
        data: allModels.data.models,
      });
    }

    return {
      loading: allModels.loading,
      error: allModels.error,
      data: allModels.data?.models,
    };
  }
  return {
    loading: false,
    error: undefined,
    data: cached.data,
  };
}

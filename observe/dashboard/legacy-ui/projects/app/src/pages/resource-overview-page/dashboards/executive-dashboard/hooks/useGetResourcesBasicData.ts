import { AssetCategory, useGetResourceBasicInfoForOrgQuery } from 'generated/graphql';
import { ApolloError } from '@apollo/client';
import { useMemo } from 'react';
import { atom, useRecoilState } from 'recoil';
import { ONE_HOUR_IN_MILLIS } from 'ui/constants';

type AtomType = {
  info: OrgBasicExecDashData;
  lastQueryTimestamp: number;
};
const orgBasicExecDashDataAtom = atom<AtomType | undefined>({
  default: undefined,
  key: 'org-exec-dash-basic-info',
});

export interface OrgBasicExecDashData {
  loading?: boolean;
  error?: ApolloError;
  data?: {
    hasModels: boolean;
    hasDatasets: boolean;
    // TODO - global org lineage filter #85ztj8kn9
    oldestBatchTimestamp: number | null;
    lastBatchTimestamp: number | null;
  };
}
const CACHE_TTL_SECONDS = ONE_HOUR_IN_MILLIS;
export const useGetOrgBasicData = (skip?: boolean): OrgBasicExecDashData => {
  const [cachedData, setCachedData] = useRecoilState(orgBasicExecDashDataAtom);
  const currentTimestamp = new Date().getTime();
  const cachedTimestamp = cachedData ? new Date(cachedData.lastQueryTimestamp) : null;
  const validCache = !!(
    cachedTimestamp &&
    currentTimestamp < new Date(cachedTimestamp).setSeconds(cachedTimestamp.getSeconds() + CACHE_TTL_SECONDS)
  );
  const { data, loading, error } = useGetResourceBasicInfoForOrgQuery({ skip: validCache || skip });
  const translatedData = useMemo(() => {
    let [hasModels, hasDatasets] = [false, false];
    let [oldestBatchTimestamp, lastBatchTimestamp]: (number | null)[] = [null, null];
    data?.resources.forEach(({ assetCategory, dataAvailability }) => {
      const isModel = assetCategory === AssetCategory.Model || assetCategory === AssetCategory.Llm;
      const isDataset = assetCategory === AssetCategory.Data;
      if (isModel && !hasModels) hasModels = true;
      if (isDataset && !hasDatasets) hasDatasets = true;
      const currentOldest = Number(dataAvailability?.oldestTimestamp);
      const currentLast = Number(dataAvailability?.latestTimestamp);
      if (!oldestBatchTimestamp || currentOldest < oldestBatchTimestamp) oldestBatchTimestamp = currentOldest;
      if (!lastBatchTimestamp || currentLast > lastBatchTimestamp) lastBatchTimestamp = currentLast;
    });

    return {
      hasModels,
      hasDatasets,
      oldestBatchTimestamp,
      lastBatchTimestamp,
    };
  }, [data?.resources]);

  const info = {
    loading,
    error,
    data: translatedData,
  };

  if (data?.resources && translatedData !== cachedData?.info?.data) {
    setCachedData({ info, lastQueryTimestamp: new Date().getTime() });
    return { ...info, loading };
  }

  return { ...(cachedData?.info ?? {}), loading };
};

import { useGetResourcesTableInfoQuery } from 'generated/graphql';
import { useMemo } from 'react';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';
import { ResourcesTableInfo, FetchedQuery, translateAnomaliesData } from './resourcesTableUtils';

type FetchedTableData = {
  resourcesData: FetchedQuery<ResourcesTableInfo>;
};
export const useResourcesFetchTableData = (isModel: boolean): FetchedTableData => {
  const { dateRange, loading: loadingDateRange } = useSuperGlobalDateRange();
  const {
    data: tableData,
    loading: loadingTableData,
    error: errorTableData,
  } = useGetResourcesTableInfoQuery({
    variables: {
      ...dateRange,
    },
    skip: loadingDateRange,
    errorPolicy: 'all',
  });

  const translatedResourcesAnomaliesData = useMemo(() => {
    return translateAnomaliesData(isModel, tableData?.resources ?? []);
  }, [tableData?.resources, isModel]);

  return {
    resourcesData: {
      data: translatedResourcesAnomaliesData,
      loading: loadingTableData || loadingDateRange,
      error: !!errorTableData,
    },
  };
};

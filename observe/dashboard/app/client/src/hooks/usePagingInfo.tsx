import { LIMIT_QUERY_NAME, OFFSET_QUERY_NAME } from '~/utils/searchParamsConstants';
import { useEffect } from 'react';

import { SetSearchParamsFn, useSearchAndHashParams } from './useSearchAndHashParams';

interface IPagingInfo {
  limit: number;
  offset: number;
}

const DEFAULT_LIMIT = 30;
const DEFAULT_OFFSET = 0;

export type UsePagingInfoReturnType = {
  pagingInfo: IPagingInfo;
  page: number;
  setPage: (newPage: number) => void;
  setPageSize: (pageSize: number) => void;
};

export type UsePagingInfoProps = {
  customLimit?: number;
  customOffset?: number;
  customPaginationState?: {
    value: URLSearchParams;
    setter: SetSearchParamsFn;
  };
};

export function usePagingInfo({
  customLimit,
  customOffset,
  customPaginationState,
}: UsePagingInfoProps = {}): UsePagingInfoReturnType {
  const [searchParams, setSearchParams] = useSearchAndHashParams();
  const usedParamsState = customPaginationState?.value || searchParams;
  const usedParamsSetter = customPaginationState?.setter || setSearchParams;

  const defaultLimit = customLimit ?? DEFAULT_LIMIT;
  const defaultOffset = customOffset ?? DEFAULT_OFFSET;

  const currentLimit = usedParamsState.get(LIMIT_QUERY_NAME) ?? '';
  const currentOffset = usedParamsState.get(OFFSET_QUERY_NAME) ?? '';

  const pagingInfo = {
    limit: currentLimit ? Number(currentLimit) : defaultLimit,
    offset: currentOffset ? Number(currentOffset) : defaultOffset,
  };

  // Set default limit and offset if they are not set, should run only once
  useEffect(() => {
    if (!currentLimit || !currentOffset) {
      usedParamsSetter(
        (nextSearchParams) => {
          const newSearchParams = new URLSearchParams(nextSearchParams);
          newSearchParams.set(LIMIT_QUERY_NAME, defaultLimit.toString());
          newSearchParams.set(OFFSET_QUERY_NAME, defaultOffset.toString());
          return newSearchParams;
        },
        { replace: true },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setPage = (newPage: number) => {
    usedParamsSetter((nextSearchParams) => {
      const newSearchParams = new URLSearchParams(nextSearchParams);
      const newOffset = newPage * pagingInfo.limit;
      newSearchParams.set(OFFSET_QUERY_NAME, newOffset.toString());
      return newSearchParams;
    });
  };

  const setPageSize = (pageSize: number) => {
    usedParamsSetter((nextSearchParams) => {
      const newSearchParams = new URLSearchParams(nextSearchParams);
      newSearchParams.set(LIMIT_QUERY_NAME, pageSize.toString());
      if (pageSize > pagingInfo.offset) {
        newSearchParams.set(OFFSET_QUERY_NAME, '0');
      }
      return newSearchParams;
    });
  };

  const page = Math.floor(pagingInfo.offset / pagingInfo.limit);

  return {
    pagingInfo,
    page,
    setPage,
    setPageSize,
  };
}

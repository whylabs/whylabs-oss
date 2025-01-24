import { useEffect } from 'react';
import { LIMIT_QUERY_NAME, OFFSET_QUERY_NAME } from '~/utils/searchParamsConstants';

import { useSearchAndHashParams } from './useSearchAndHashParams';

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
};

export function usePagingInfo(props?: UsePagingInfoProps): UsePagingInfoReturnType {
  const [searchParams, setSearchParams] = useSearchAndHashParams();

  const defaultLimit = props?.customLimit ?? DEFAULT_LIMIT;
  const defaultOffset = props?.customOffset ?? DEFAULT_OFFSET;

  const currentLimit = searchParams.get(LIMIT_QUERY_NAME) ?? '';
  const currentOffset = searchParams.get(OFFSET_QUERY_NAME) ?? '';

  const pagingInfo = {
    limit: currentLimit ? Number(currentLimit) : defaultLimit,
    offset: currentOffset ? Number(currentOffset) : defaultOffset,
  };

  // Set default limit and offset if they are not set, should run only once
  useEffect(() => {
    if (!currentLimit || !currentOffset) {
      setSearchParams(
        (nextSearchParams) => {
          nextSearchParams.set(LIMIT_QUERY_NAME, defaultLimit.toString());
          nextSearchParams.set(OFFSET_QUERY_NAME, defaultOffset.toString());
          return nextSearchParams;
        },
        { replace: true },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setPage = (newPage: number) => {
    setSearchParams((nextSearchParams) => {
      const newOffset = newPage * pagingInfo.limit;
      nextSearchParams.set(OFFSET_QUERY_NAME, newOffset.toString());
      return nextSearchParams;
    });
  };

  const setPageSize = (pageSize: number) => {
    setSearchParams((nextSearchParams) => {
      nextSearchParams.set(LIMIT_QUERY_NAME, pageSize.toString());
      return nextSearchParams;
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

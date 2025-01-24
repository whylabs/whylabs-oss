import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { getNumericQueryValues } from 'utils/queryUtils';
import { removeKeys } from 'utils/queryCleaner';
import { atomFamily, useRecoilState } from 'recoil';
import { LIMIT_TAG, OFFSET_TAG } from 'types/navTags';
import { DashbirdError } from 'utils/error-utils';
import { DashbirdErrorCode } from 'generated/graphql';
import { useWhyLabsSnackbar } from './useWhyLabsSnackbar';

const selectedPagingInfoAtom = atomFamily<IPagingInfo, UsePagingInfoProps | undefined>({
  key: 'SelectedPagingInfo',
  default: (params) => ({ limit: params?.customLimit ?? 30, offset: params?.customOffset ?? 0 }),
});

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
  handleExceededLimit: (error: DashbirdError) => void;
};

export type UsePagingInfoProps = {
  customLimit?: number;
  customOffset?: number;
};

export function usePagingInfo(props?: UsePagingInfoProps): UsePagingInfoReturnType {
  const { search: searchString } = useLocation();
  const navigate = useNavigate();
  const [pagingInfo, setPagingInfo] = useRecoilState<IPagingInfo>(selectedPagingInfoAtom(props));
  const { enqueueErrorSnackbar } = useWhyLabsSnackbar();

  const defaultLimit = props?.customLimit ?? DEFAULT_LIMIT;
  const defaultOffset = props?.customOffset ?? DEFAULT_OFFSET;
  const currentLimit = pagingInfo.limit;
  const currentOffset = pagingInfo.offset;

  useEffect(() => {
    const qsLimit = getNumericQueryValues(searchString, LIMIT_TAG)[0];
    const qsOffset = getNumericQueryValues(searchString, OFFSET_TAG)[0];

    const isNotEqualAsQueryString = (testLimit: number, testOffset: number) => {
      return qsLimit !== testLimit || qsOffset !== testOffset;
    };

    if (!isNotEqualAsQueryString(currentLimit, currentOffset)) {
      return;
    }

    if (Number.isInteger(qsLimit) && Number.isInteger(qsOffset)) {
      setPagingInfo({ limit: qsLimit, offset: qsOffset });
    } else if (isNotEqualAsQueryString(defaultLimit, defaultOffset)) {
      setPagingInfo({
        limit: defaultLimit,
        offset: defaultOffset,
      });
    }
  }, [currentLimit, currentOffset, defaultLimit, defaultOffset, searchString, setPagingInfo]);

  const getUpdatedPagingInfoUrl = (newLimit: number, newOffset: number) => {
    const otherSearchItems = removeKeys([LIMIT_TAG, OFFSET_TAG], searchString);
    const updatedSearchString = `${otherSearchItems}${
      otherSearchItems ? '&' : '?'
    }${LIMIT_TAG}=${newLimit}&${OFFSET_TAG}=${newOffset}`;
    return updatedSearchString;
  };

  const updatePagingInfoUrl = (newLimit: number, newOffset: number) => {
    const updatedSearchString = getUpdatedPagingInfoUrl(newLimit, newOffset);
    navigate({ search: updatedSearchString });
  };

  const setPage = (newPage: number) => {
    updatePagingInfoUrl(currentLimit, newPage * currentLimit);
  };

  const setPageSize = (pageSize: number) => {
    updatePagingInfoUrl(pageSize, currentOffset);
  };

  const page = Math.floor(currentOffset / currentLimit);

  function handleExceededLimit({ extensions }: DashbirdError) {
    const { code, safeErrorMsg } = extensions;
    if (code === DashbirdErrorCode.PaginationLimitExceeded) {
      setPageSize(defaultLimit);
    } else {
      enqueueErrorSnackbar({
        explanation: safeErrorMsg,
        err: null,
      });
    }
  }

  return {
    pagingInfo,
    page,
    setPage,
    setPageSize,
    handleExceededLimit,
  };
}

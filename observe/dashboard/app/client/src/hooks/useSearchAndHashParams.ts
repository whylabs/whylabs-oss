import { useCallback } from 'react';
import { NavigateOptions, useLocation, useNavigate, useSearchParams } from 'react-router-dom';

export type SetSearchParamsFn = (
  nextInit: (prevSearchParams: URLSearchParams) => URLSearchParams,
  options?: NavigateOptions & {
    hash?: string;
    preserveHash?: boolean;
  },
) => void;

export function useSearchAndHashParams(): [URLSearchParams, SetSearchParamsFn] {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const setSearchParams = useCallback<SetSearchParamsFn>(
    (nextInit, options) => {
      const { hash, preserveHash = true, ...restOptions } = options ?? {};
      const newSearchParams = nextInit(searchParams);

      const formatHash = (raw: string) => {
        if (raw.startsWith('##')) return raw.replace('##', '#');
        if (raw.startsWith('#')) return raw;
        return `#${raw}`;
      };

      const hashString = (() => {
        // If hash is provided, use it
        if (typeof hash === 'string') return formatHash(hash);

        // If preserveHash is false, remove hash
        if (!preserveHash) return undefined;

        // Otherwise, keep the current hash
        return location.hash;
      })();

      navigate(
        {
          search: newSearchParams.toString(),
          hash: hashString,
        },
        restOptions,
      );
    },
    [location.hash, navigate, searchParams],
  );

  return [searchParams, setSearchParams];
}

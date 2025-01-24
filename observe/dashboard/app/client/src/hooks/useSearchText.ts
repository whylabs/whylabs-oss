import { useDebouncedValue } from '@mantine/hooks';
import { SEARCH_TEXT_QUERY_NAME } from '~/utils/searchParamsConstants';

import { useSearchAndHashParams } from './useSearchAndHashParams';

interface UseSearchTextReturn {
  debouncedSearchText: string;
  searchText: string;
  setSearchText(newSearchText: string): void;
}

export default function useSearchText(): UseSearchTextReturn {
  const [searchParams, setSearchParams] = useSearchAndHashParams();

  const searchText = searchParams.get(SEARCH_TEXT_QUERY_NAME) ?? '';
  const [debouncedSearchText] = useDebouncedValue(searchText, 300);

  function setSearchText(newSearchText: string) {
    setSearchParams((nextSearchParams) => {
      if (newSearchText.length > 0) {
        nextSearchParams.set(SEARCH_TEXT_QUERY_NAME, newSearchText);
      } else {
        nextSearchParams.delete(SEARCH_TEXT_QUERY_NAME);
      }
      return nextSearchParams;
    });
  }

  return {
    debouncedSearchText,
    searchText,
    setSearchText,
  };
}

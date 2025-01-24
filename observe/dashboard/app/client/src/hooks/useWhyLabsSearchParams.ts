import {
  BACK_TO_QUERY_NAME,
  DATE_END_QUERY_NAME,
  DATE_START_QUERY_NAME,
  PRESET_RANGE_QUERY_NAME,
} from '~/utils/searchParamsConstants';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export const useWhyLabsSearchParams = () => {
  const [searchParams] = useSearchParams();

  const backToMainStackURL = useMemo(() => {
    const backToUrl = searchParams.get(BACK_TO_QUERY_NAME);
    if (!backToUrl) return null;
    const indexOfSearchQuery = backToUrl.indexOf('?');
    const currentSearchQuery = indexOfSearchQuery !== -1 ? backToUrl.substring(indexOfSearchQuery) : '';
    const oldSearchParams = new URLSearchParams(currentSearchQuery);
    const start = searchParams.get(DATE_START_QUERY_NAME);
    const end = searchParams.get(DATE_END_QUERY_NAME);
    const preset = searchParams.get(PRESET_RANGE_QUERY_NAME);
    if (start && end) {
      oldSearchParams.set(DATE_START_QUERY_NAME, start);
      oldSearchParams.set(DATE_END_QUERY_NAME, end);
    }
    if (preset) {
      oldSearchParams.set(PRESET_RANGE_QUERY_NAME, preset);
    }
    const oldBaseUrl = backToUrl.substring(0, indexOfSearchQuery);
    const updatedSearchString = oldSearchParams.toString();

    if (updatedSearchString) {
      return `${oldBaseUrl}?${updatedSearchString}`;
    }
    return backToUrl;
  }, [searchParams]);

  const globalPickerSearchString = useMemo(() => {
    const start = searchParams.get(DATE_START_QUERY_NAME);
    const end = searchParams.get(DATE_END_QUERY_NAME);
    const preset = searchParams.get(PRESET_RANGE_QUERY_NAME);
    const globalDatePickerParams = new URLSearchParams();
    if (start && end) {
      globalDatePickerParams.set(DATE_START_QUERY_NAME, start);
      globalDatePickerParams.set(DATE_END_QUERY_NAME, end);
    }
    if (preset) {
      globalDatePickerParams.set(PRESET_RANGE_QUERY_NAME, preset);
    }
    return globalDatePickerParams.toString();
  }, [searchParams]);

  return {
    globalPickerSearchString,
    backToMainStackURL,
  };
};

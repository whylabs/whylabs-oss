import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DATE_END_QUERY_NAME, DATE_START_QUERY_NAME, PRESET_RANGE_QUERY_NAME } from '~/utils/searchParamsConstants';

export const useWhyLabsSearchParams = () => {
  const [searchParams] = useSearchParams();

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
  };
};

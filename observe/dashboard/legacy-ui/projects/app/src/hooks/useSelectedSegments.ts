import { SegmentTag } from 'generated/graphql';
import { segmentStringToTags } from 'utils/segments';
import { useMemo } from 'react';
import useFilterQueryString, { FilterKeys } from './useFilterQueryString';

type HookReturnType = {
  onChange: (filters: SegmentTag[]) => void;
  selectedSegment: SegmentTag[];
};

export default function useSelectedSegments(): HookReturnType {
  const { addFiltersToQueryParams, getFiltersFromQueryParams } = useFilterQueryString(FilterKeys.searchString);

  const onChange = (filters: SegmentTag[]) => {
    const wildcardSegments = filters.filter(({ value }) => value === '*');
    const newSearchText = filters
      .filter(
        ({ key: segmentKey, value }) => !(wildcardSegments.find(({ key }) => key === segmentKey) && value !== '*'),
      )
      .map((f) => `${f.key}=${f.value}`)
      .join('&');

    addFiltersToQueryParams(newSearchText ? [newSearchText] : []);
  };

  const selectedSegment = useMemo((): SegmentTag[] => {
    const searchText = getFiltersFromQueryParams()[0] ?? '';
    return segmentStringToTags(searchText);
  }, [getFiltersFromQueryParams]);

  return {
    onChange,
    selectedSegment,
  };
}

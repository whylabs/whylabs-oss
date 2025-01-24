import { ParsedSegment, SEGMENT_SEARCH_PREFIX } from 'pages/page-types/pageUrlQuery';

const SEARCH_SEGMENT_KEY = `${SEGMENT_SEARCH_PREFIX}key`;
const SEARCH_SEGMENT_VALUE = `${SEGMENT_SEARCH_PREFIX}value`;

export function getSegmentsFromSearch(urlSearch: URLSearchParams): ParsedSegment {
  const keys = urlSearch.getAll(SEARCH_SEGMENT_KEY);
  const values = urlSearch.getAll(SEARCH_SEGMENT_VALUE);
  const segment: ParsedSegment = { tags: [] };
  keys.forEach((key, idx) => {
    if (idx < values.length) {
      segment.tags.push({ key, value: values[idx] });
    }
  });
  return segment;
}

export function addOrReplaceSegmentInSearch(searchParamsToModify: URLSearchParams, segment: ParsedSegment): boolean {
  const originalSegmentExisted =
    searchParamsToModify.has(SEARCH_SEGMENT_KEY) && searchParamsToModify.has(SEARCH_SEGMENT_VALUE);
  searchParamsToModify.delete(SEARCH_SEGMENT_KEY);
  searchParamsToModify.delete(SEARCH_SEGMENT_VALUE);
  segment.tags.forEach((entry) => {
    searchParamsToModify.append(SEARCH_SEGMENT_KEY, entry.key);
    searchParamsToModify.append(SEARCH_SEGMENT_VALUE, entry.value);
  });
  return originalSegmentExisted;
}

import { SELECTED_SEGMENT_QUERY_NAME } from '~/utils/searchParamsConstants';
import { segmentStringToTags } from '~/utils/segments';
import { useSearchParams } from 'react-router-dom';

export const useSegments = (segmentQueryName = SELECTED_SEGMENT_QUERY_NAME) => {
  const [searchParams] = useSearchParams();
  const segment = searchParams.get(segmentQueryName);
  return {
    parsed: segmentStringToTags(segment),
    raw: segment,
  };
};

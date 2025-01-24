import { useLocation } from 'react-router-dom';
import { getQueryValues } from 'utils/queryUtils';
import { useMemo } from 'react';

export const FEATURE_HIGHLIGHT_TAG = 'feature-highlight';

export function useSearchHighlight(): readonly [string | null, string[]] {
  const { search } = useLocation();
  const foundItems = useMemo(() => getQueryValues(search, FEATURE_HIGHLIGHT_TAG), [search]);
  const singleItem = foundItems.length > 0 ? foundItems[0] : null;
  return [singleItem, foundItems] as const;
}

import { LimitSpec, SegmentTag, SortDirection } from '../../types/api';
import { makeUniqueAndFilter, withCaseInsensitiveStrFilter, withStandardSorter } from './common-filters';

/**
 * Filters, sorts, and paginates the provided segment tags.
 * We need to sort and filter values in Dashbird even though we sort/filter in Druid, because the current Druid
 * query sorts/filters on both key and value
 * @param tags The tags to process
 * @param excludedTags Tags that should be dropped from the initial list (e.g. because we don't want to return currently selected tags)
 * @param searchField Which segment tag field to search on (i.e. key or value)
 * @param limitSpec Offset/limit and ordering to apply
 * @param searchString String to search the searchField by
 */
export const filterSegmentTags = (
  tags: SegmentTag[],
  excludedTags: SegmentTag[],
  searchField: keyof Pick<SegmentTag, 'key' | 'value'>,
  limitSpec?: LimitSpec | null,
  searchString?: string | null,
): string[] => {
  const items = tags
    .filter((tag) => {
      for (const excludedTag of excludedTags) {
        if (excludedTag.key === tag.key && excludedTag.value === tag.value) {
          return false;
        }
      }

      return true;
    })
    .map((t) => t[searchField]);

  return makeUniqueAndFilter(
    items,
    withCaseInsensitiveStrFilter(searchString),
    withStandardSorter(limitSpec?.sortDirection ?? SortDirection.Asc),
    limitSpec,
  );
};

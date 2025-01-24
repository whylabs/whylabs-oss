import { useAtom } from 'jotai';
import { atomWithHash } from 'jotai-location';
import { useResetAtom } from 'jotai/utils';
import { SELECTED_QUERY_NAME } from '~/utils/searchParamsConstants';

export const selectedIdsAtom = atomWithHash<string[]>(SELECTED_QUERY_NAME, [], {
  deserialize: (str) => {
    try {
      const parsedArray = JSON.parse(str) as string[];
      return parsedArray.length === 0 ? [] : parsedArray;
    } catch (e) {
      return [];
    }
  },
});

export function useSelectedIds() {
  const [selectedIds, setSelectedIds] = useAtom(selectedIdsAtom);
  const resetSelectedIds = useResetAtom(selectedIdsAtom);

  return {
    resetSelectedIds,
    selectedIds,
    setSelectedIds,
  };
}

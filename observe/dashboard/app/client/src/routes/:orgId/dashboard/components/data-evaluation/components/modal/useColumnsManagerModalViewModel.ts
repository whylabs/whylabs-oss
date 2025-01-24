import { useDebouncedState } from '@mantine/hooks';
import { AvailableItem } from '~/components/design-system/modal/ItemListSelectionModal';
import { useReferenceProfile } from '~/hooks/resources/useReferenceProfile';
import { trpc } from '~/utils/trpc';
import { EvaluationColumnDefinitionType } from '~server/trpc/dashboard/types/data-evalutation-types';
import { useEffect, useMemo, useState } from 'react';

import { DataEvaluationBuilderChild } from '../../useDataEvaluationBuilderViewModel';
import { TABLE_COLUMN_GROUP_BY_LIMIT, getSegmentColumnDefinition } from '../../utils';

type ModalTempSelection = {
  availableItems: Map<string, AvailableItem>;
  selectedItems: Map<string, AvailableItem>;
};

export const useColumnsManagerModalViewModel = ({ parentViewModel }: DataEvaluationBuilderChild) => {
  const { displayColumnManagementModalState, queryParams, tempControlsState } = parentViewModel;

  const usedParams = displayColumnManagementModalState.value === 'persistedParams' ? queryParams : tempControlsState;
  const segmentColumnDefinition = getSegmentColumnDefinition(usedParams);

  /*
   * these queries are likely to use the trpc cache because it was already fetched to populate side controls, although we must call it with
   * the resource id from query params to avoid break the table preview if we have non-applied changes
   * */
  const { data: availableSegmentKeys } = trpc.meta.segments.listValueForKey.useQuery(
    {
      orgId: parentViewModel.orgId,
      resourceId: usedParams?.resourceId ?? '',
      key: segmentColumnDefinition?.groupBySegmentKey ?? '',
      tags: [],
    },
    { enabled: !!(segmentColumnDefinition?.groupBySegmentKey && usedParams?.resourceId) },
  );
  const { data: refProfilesData } = useReferenceProfile({
    orgId: parentViewModel.orgId,
    resourceId: usedParams?.resourceId ?? '',
  });
  /// -----

  const { tableColumnsDefinition } = usedParams ?? {};
  const isSegmentColumns = tableColumnsDefinition?.type === EvaluationColumnDefinitionType.Segment;

  const [allItems, selectedItems] = useMemo((): [AvailableItem[], string[]] => {
    if (usedParams?.tableColumnsDefinition?.type === EvaluationColumnDefinitionType.Segment) {
      const available = availableSegmentKeys?.map((v) => ({ label: v, value: v })) ?? [];
      const selected = usedParams.tableColumnsDefinition.segmentValues ?? [];
      return [available, selected];
    }

    if (usedParams?.tableColumnsDefinition?.type === EvaluationColumnDefinitionType.ReferenceProfile) {
      const selected = usedParams.tableColumnsDefinition.referenceProfileIds ?? [];
      return [refProfilesData, selected];
    }
    return [[], []];
  }, [usedParams?.tableColumnsDefinition, availableSegmentKeys, refProfilesData]);

  const initialState: ModalTempSelection = useMemo(() => {
    const filteredAvailableItems = new Map<string, AvailableItem>();
    const selectedAvailableItems = new Map<string, AvailableItem>();
    allItems.forEach((item) => {
      const targetMap = selectedItems.includes(item.value) ? selectedAvailableItems : filteredAvailableItems;
      targetMap.set(item.value, item);
    });
    return {
      availableItems: filteredAvailableItems,
      selectedItems: selectedAvailableItems,
    };
  }, [allItems, selectedItems]);

  const [tempSelectionState, setTempSelectionState] = useState<ModalTempSelection>(structuredClone(initialState));
  const isOpen = !!displayColumnManagementModalState.value;
  const [searchTerm, setSearchTerm] = useDebouncedState<string>('', 250, { leading: true });

  useEffect(() => {
    if (isOpen) {
      setTempSelectionState(structuredClone(initialState));
    }
  }, [initialState, isOpen]);

  const selectItemHandler = (selected: AvailableItem[]) => {
    if (
      TABLE_COLUMN_GROUP_BY_LIMIT !== undefined &&
      tempSelectionState.selectedItems.size >= TABLE_COLUMN_GROUP_BY_LIMIT
    )
      return;
    setTempSelectionState((curr) => {
      const newAvailable = new Map(curr.availableItems);
      const newSelected = new Map(curr.selectedItems);
      selected.forEach((item) => {
        newAvailable.delete(item.value);
        newSelected.set(item.value, item);
      });
      return {
        availableItems: newAvailable,
        selectedItems: newSelected,
      };
    });
  };

  const removeItemHandler = (targetItems: AvailableItem[]) => {
    setTempSelectionState((curr) => {
      const newAvailable = new Map(curr.availableItems);
      const newSelected = new Map(curr.selectedItems);
      targetItems.forEach((item) => {
        newAvailable.set(item.value, item);
        newSelected.delete(item.value);
      });
      return {
        availableItems: newAvailable,
        selectedItems: newSelected,
      };
    });
  };

  const onClose = () => {
    displayColumnManagementModalState.setter(null);
    setSearchTerm('');
  };

  const onApplyChanges = () => {
    const currentSelected = [...tempSelectionState.selectedItems.keys()];
    if (isSegmentColumns) {
      parentViewModel.onChangeColumnDefinitionSegmentValues(currentSelected);
    } else {
      parentViewModel.onChangeColumnDefinitionRefProfileValues(currentSelected);
    }
    onClose();
  };

  const selectedSegmentKey = isSegmentColumns ? tableColumnsDefinition.groupBySegmentKey : undefined;

  return {
    items: tempSelectionState,
    selectItemHandler,
    removeItemHandler,
    searchState: {
      value: searchTerm,
      setter: setSearchTerm,
    },
    onClose,
    onApplyChanges,
    isSegmentColumns,
    selectedSegmentKey,
    isOpen,
  };
};

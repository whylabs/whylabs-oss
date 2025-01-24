import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import { AvailableItem } from '~/components/design-system/modal/ItemListSelectionModal';
import { metricObjectToSelectFormat } from '~/routes/:orgId/dashboard/components/data-evaluation/utils';
import { CUSTOM_METRIC_VALUE_SEPARATOR } from '~server/graphql/resolvers/types/metrics';
import {
  EvaluationColumnDefinitionType,
  OVERALL_SEGMENT_KEY_VALUE,
} from '~server/trpc/dashboard/types/data-evalutation-types';
import { useEffect, useMemo, useState } from 'react';

import { DataEvaluationBuilderChild } from '../../useDataEvaluationBuilderViewModel';

export enum RowsMetricType {
  'columnMetrics' = 'columnMetrics',
  'datasetMetrics' = 'datasetMetrics',
}

type ModalTempSelection = {
  [key in 'columns' | 'columnMetrics' | 'datasetMetrics']: {
    available: Map<string, AvailableItem>;
    selected: Map<string, AvailableItem>;
    previouslySelected: Map<string, AvailableItem>;
  };
};

const useStyles = createStyles({
  skipButton: {
    background: Colors.transparent,
    borderColor: Colors.secondaryLight700,
    color: Colors.secondaryLight1000,
    '&:hover': {
      background: Colors.secondaryLight50,
    },
  },
});

export type RowsManagerModalProps = { isOpen: boolean; onClose: () => void } & DataEvaluationBuilderChild;

export const useRowsManagerModalViewModal = ({ parentViewModel, onClose, isOpen }: RowsManagerModalProps) => {
  const { tempControlsState, resourceColumnsList, profileMetrics, onChangeDataSource, queryParams } = parentViewModel;
  const { classes } = useStyles();

  const initialState: ModalTempSelection = useMemo(() => {
    const availableColumns = new Map<string, AvailableItem>();
    const selectedColumns = new Map<string, AvailableItem>();
    const previouslySelectedColumns = new Map<string, AvailableItem>();
    const isChangingPersistedResourceRows =
      !!queryParams?.resourceId && queryParams.resourceId === tempControlsState.resourceId;
    resourceColumnsList?.data?.forEach((column) => {
      const columnAlreadySelected = !!tempControlsState.dataSource?.resourceColumns?.includes(column.name);
      if (isChangingPersistedResourceRows && columnAlreadySelected) {
        // should filter out selected columns when adding new rows
        previouslySelectedColumns.set(column.name, { label: column.name, value: column.name });
        return;
      }
      if (columnAlreadySelected) {
        selectedColumns.set(column.name, { label: column.name, value: column.name });
        return;
      }
      availableColumns.set(column.name, { label: column.name, value: column.name });
    });
    const availableDatasetMetrics = new Map<string, AvailableItem>();
    const selectedDatasetMetrics = new Map<string, AvailableItem>();
    const previouslySelectedDatasetMetrics = new Map<string, AvailableItem>();
    const availableColumnMetrics = new Map<string, AvailableItem>();
    const selectedColumnMetrics = new Map<string, AvailableItem>();
    const previouslySelectedColumnMetrics = new Map<string, AvailableItem>();
    profileMetrics?.data?.forEach((metric) => {
      const label =
        metric.source === 'Profiles' && metric.fixedColumn
          ? `${metric.label}.${metric.value.split(CUSTOM_METRIC_VALUE_SEPARATOR)[0]?.toLowerCase()}`
          : metric.label;
      const [availableMetricsMap, selectedMetricsMap, previouslySelectedMetricsMap] =
        metric.group === 'DATASET'
          ? [availableDatasetMetrics, selectedDatasetMetrics, previouslySelectedDatasetMetrics]
          : [availableColumnMetrics, selectedColumnMetrics, previouslySelectedColumnMetrics];
      const metricAlreadySelected = !!tempControlsState.dataSource?.metrics?.find(
        (m) => metric.value === metricObjectToSelectFormat(m),
      );
      if (isChangingPersistedResourceRows && metricAlreadySelected) {
        // should filter out selected metrics when adding new rows
        previouslySelectedMetricsMap.set(metric.value, { label, value: metric.value });
        return;
      }
      if (metricAlreadySelected) {
        selectedMetricsMap.set(metric.value, { label, value: metric.value });
        return;
      }
      availableMetricsMap.set(metric.value, { label, value: metric.value });
    });

    return {
      columns: {
        available: availableColumns,
        selected: selectedColumns,
        previouslySelected: previouslySelectedColumns,
      },
      columnMetrics: {
        available: availableColumnMetrics,
        selected: selectedColumnMetrics,
        previouslySelected: previouslySelectedColumnMetrics,
      },
      datasetMetrics: {
        available: availableDatasetMetrics,
        selected: selectedDatasetMetrics,
        previouslySelected: previouslySelectedDatasetMetrics,
      },
    };
  }, [
    profileMetrics?.data,
    queryParams?.resourceId,
    resourceColumnsList?.data,
    tempControlsState.dataSource?.metrics,
    tempControlsState.dataSource?.resourceColumns,
    tempControlsState.resourceId,
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [stage, setStage] = useState<1 | 2>(1);
  const [metricType, setMetricType] = useState<RowsMetricType>(RowsMetricType.columnMetrics);

  const [tempModalSelectionState, setTempModalSelectionState] = useState<ModalTempSelection>(
    structuredClone(initialState),
  );

  useEffect(() => {
    if (isOpen) {
      setTempModalSelectionState(structuredClone(initialState));
      setStage(1);
      setMetricType(RowsMetricType.columnMetrics);
    }
  }, [initialState, isOpen]);

  const { tableColumnsDefinition } = tempControlsState ?? {};
  const isSegmentColumns = tableColumnsDefinition?.type === EvaluationColumnDefinitionType.Segment;
  const selectedSegmentKey = isSegmentColumns ? tableColumnsDefinition.groupBySegmentKey : undefined;
  const usedSegmentKey =
    !selectedSegmentKey || selectedSegmentKey === OVERALL_SEGMENT_KEY_VALUE ? null : selectedSegmentKey;

  const onCloseHandler = () => {
    setSearchTerm('');
    onClose();
  };

  const getItems = () => {
    if (stage === 1 && metricType === RowsMetricType.columnMetrics) {
      return {
        left: [...tempModalSelectionState.columns.available.values()],
        right: [...tempModalSelectionState.columns.selected.values()],
      };
    }
    if (stage === 1 && metricType === RowsMetricType.datasetMetrics) {
      return {
        left: [...tempModalSelectionState.datasetMetrics.available.values()],
        right: [...tempModalSelectionState.datasetMetrics.selected.values()],
      };
    }
    return {
      left: [...tempModalSelectionState.columnMetrics.available.values()],
      right: [...tempModalSelectionState.columnMetrics.selected.values()],
    };
  };

  const selectItem = (target: keyof ModalTempSelection) => (selected: AvailableItem[]) => {
    setTempModalSelectionState((prev) => {
      const newState = { ...prev };
      const targetGroup = prev[target];
      selected.forEach((item) => {
        targetGroup.available.delete(item.value);
        targetGroup.selected.set(item.value, item);
      });
      return newState;
    });
  };

  const removeItem = (target: keyof ModalTempSelection) => (targetItems: AvailableItem[]) => {
    setTempModalSelectionState((prev) => {
      const newState = { ...prev };
      const targetGroup = prev[target];
      targetItems.forEach((item) => {
        targetGroup.selected.delete(item.value);
        targetGroup.available.set(item.value, item);
      });
      return newState;
    });
  };

  const getItemsClickHandler = () => {
    if (stage === 1 && metricType === RowsMetricType.columnMetrics) {
      return {
        left: selectItem('columns'),
        right: removeItem('columns'),
      };
    }
    if (stage === 1 && metricType === RowsMetricType.datasetMetrics) {
      return {
        left: selectItem('datasetMetrics'),
        right: removeItem('datasetMetrics'),
      };
    }
    return {
      left: selectItem('columnMetrics'),
      right: removeItem('columnMetrics'),
    };
  };

  const getConfirmButtonDisabledState = () => {
    if (stage === 1 && metricType === RowsMetricType.columnMetrics) {
      const totalSelected =
        tempModalSelectionState.columns.previouslySelected.size + tempModalSelectionState.columns.selected.size;
      return !totalSelected;
    }
    if (stage === 1 && metricType === RowsMetricType.datasetMetrics) {
      return !tempModalSelectionState.datasetMetrics.selected.size;
    }
    const hasPreviousColumnMetricsSelected = !!(
      tempModalSelectionState.columns.previouslySelected.size &&
      tempModalSelectionState.columnMetrics.previouslySelected.size
    );
    if (hasPreviousColumnMetricsSelected) {
      // disabled if nothing is selected
      return !tempModalSelectionState.columns.selected.size && !tempModalSelectionState.columnMetrics.selected.size;
    }
    // disabled if either column or metrics were not selected
    return !tempModalSelectionState.columns.selected.size || !tempModalSelectionState.columnMetrics.selected.size;
  };

  const handleConfirmButtonClick = () => {
    if (getConfirmButtonDisabledState()) return;
    if (stage === 1 && metricType === RowsMetricType.columnMetrics) {
      setSearchTerm('');
      setStage(2);
      return;
    }
    const isDatasetMetrics = metricType === RowsMetricType.datasetMetrics;
    const newColumns = isDatasetMetrics ? [] : [...tempModalSelectionState.columns.selected.keys()];
    const newMetrics = isDatasetMetrics
      ? [...tempModalSelectionState.datasetMetrics.selected.keys()]
      : [...tempModalSelectionState.columnMetrics.selected.keys()];
    onChangeDataSource(newColumns, newMetrics);
    onCloseHandler();
  };

  const onChangeMetricType = (value: RowsMetricType) => {
    setMetricType(value);
    setTempModalSelectionState(structuredClone(initialState));
    setSearchTerm('');
  };

  const onClickBackPreviousStage = () => {
    setStage(1);
    setSearchTerm('');
  };

  const isAdditionalMetricsFlow =
    !!(
      tempModalSelectionState.columns.previouslySelected.size &&
      tempModalSelectionState.columnMetrics.previouslySelected.size
    ) || !!tempModalSelectionState.datasetMetrics.previouslySelected.size;

  const getConfirmButtonState = () => {
    const isColumnMetricSelection = metricType === RowsMetricType.columnMetrics;
    if (stage === 1 && isColumnMetricSelection) {
      if (!isAdditionalMetricsFlow) return { label: 'Next: select metric values' };
      const hasNewColumnsSelected = !!tempModalSelectionState.columns.selected.size;
      const label = hasNewColumnsSelected ? 'Next: select metric values' : 'Skip columns selection';
      const className = hasNewColumnsSelected ? undefined : classes.skipButton;
      return { label, className };
    }
    return { label: 'Add rows' };
  };

  return {
    isSegmentColumns,
    onCloseHandler,
    selectedSegmentKey: usedSegmentKey,
    searchState: {
      value: searchTerm,
      setter: setSearchTerm,
    },
    metricType,
    stage,
    getConfirmButtonDisabledState,
    handleConfirmButtonClick,
    getItems,
    getItemsClickHandler,
    onClickBackPreviousStage,
    tempModalSelectionState,
    onChangeMetricType,
    getConfirmButtonState,
    isAdditionalMetricsFlow,
  };
};

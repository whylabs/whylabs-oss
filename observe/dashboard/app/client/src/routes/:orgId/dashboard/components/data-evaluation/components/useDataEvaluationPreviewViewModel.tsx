import { createStyles } from '@mantine/core';
import { DataEvaluationResult } from '@whylabs/data-service-node-client/dist/api';
import { Colors } from '~/assets/Colors';
import { WhyLabsTableKit } from '~/components/design-system';
import { useReferenceProfile } from '~/hooks/resources/useReferenceProfile';
import { useResourceProfileMetricsSelectorData } from '~/hooks/selector-data/useResourceProfileMetricsSelectorData';
import { useDeepCompareEffect } from '~/hooks/useDeepCompareEffect';
import { usePagingInfo } from '~/hooks/usePagingInfo';
import useSort from '~/hooks/useSort';
import { SortDirectionType, SortType } from '~/types/sortTypes';
import sortByType, { sortByNumberFn, sortByStringFn } from '~/utils/genericSorting';
import { numberToPrecision } from '~/utils/numberUtils';
import { LIMIT_QUERY_NAME } from '~/utils/searchParamsConstants';
import { trpc } from '~/utils/trpc';
import { isNumber, isValidNumber } from '~/utils/typeGuards';
import { ProfileMetric } from '~server/graphql/resolvers/types/metrics';
import {
  DataEvaluationParameters,
  EvaluationColumnDefinitionType,
  OVERALL_SEGMENT_KEY_VALUE,
} from '~server/trpc/dashboard/types/data-evalutation-types';
import { download, generateCsv, mkConfig } from 'export-to-csv';
import { useCallback, useMemo, useState } from 'react';

import { DataEvaluationBuilderChild } from '../useDataEvaluationBuilderViewModel';
import { HighlightValuesType, MAX_VALUE_BG_COLOR, MIN_VALUE_BG_COLOR } from '../utils';
import {
  getDisplayedLabel,
  getMetricCellDisplayedLabel,
  getMetricTargetFromQueryId,
  getRowMetricObject,
  normalizeNumericMetric,
  translateDataForCsvExporting,
} from './utils';

const {
  Cells: { TextCell, ActionsCell },
} = WhyLabsTableKit;

const csvConfig = mkConfig({ useKeysAsHeaders: true });

const downloadCsvData = ({ data, filename }: { data: Record<string, string | number>[]; filename: string }) => {
  const csvData = generateCsv(csvConfig)(data);
  download({ ...csvConfig, filename })(csvData);
};

const useStyles = createStyles({
  dataRow: {
    color: Colors.gray900,
    fontSize: 13,
    fontFamily: 'Inconsolata',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    textWrap: 'nowrap',
  },
  cellPadding: {
    padding: '8px',
  },
  numberCell: {
    fontFamily: 'Inconsolata',
    width: 'fit-content',
    paddingTop: 1,
    paddingBottom: 1,
    borderRadius: 2,
  },
  minHighlight: {
    backgroundColor: MIN_VALUE_BG_COLOR,
  },
  maxHighlight: {
    backgroundColor: MAX_VALUE_BG_COLOR,
  },
  noPaddingCell: {
    padding: 0,
  },
});
type HighlightColor = 'blue' | 'orange';
const DEFAULT_PAGE_SIZE = 10;
type TableRow = Omit<DataEvaluationResult, ''>; // needed to transform interface to type

type AvailableColumns = 'segment' | 'targetColumn' | 'metric' | string;
export const TEXT_CELLS: AvailableColumns[] = ['segment', 'targetColumn', 'metric'];

const METRIC_COLUMN_WIDTH = 300;
export const useDataEvaluationPreviewViewModel = ({ parentViewModel }: DataEvaluationBuilderChild) => {
  const { classes, cx } = useStyles();
  const [highlightValues, setHighlightValues] = useState(new Set<HighlightValuesType>());
  const { queryParams, orgId, widgetType, setPersistedPageSize, displayName, handleMetricDeletion } = parentViewModel;

  /*
   * these queries are likely to use the trpc cache because it was already fetched to populate side controls, although we must call it with
   * the resource id from query params to avoid break the table preview if we have non-applied changes
   * */
  const { data: profileMetricsData } = useResourceProfileMetricsSelectorData({
    resourceId: queryParams?.resourceId ?? '',
    skipMonitorMetrics: true,
  });
  const { data: refProfilesData } = useReferenceProfile({
    orgId,
    resourceId: queryParams?.resourceId ?? '',
  });
  /// ----

  // we need a custom pagination state because we can have multiples widgets in the same dash and change pagination should not affect other tables
  const [tableControlsState, setTableControlsState] = useState(new URLSearchParams('sortBy=metric&sortDirection=DESC'));
  const { sortBy, sortDirection, setSort } = useSort<AvailableColumns>({
    customSortState: { value: tableControlsState, setter: setTableControlsState },
  });
  const { pagingInfo, setPage } = usePagingInfo({
    customLimit: queryParams?.tablePageSize || DEFAULT_PAGE_SIZE,
    customPaginationState: { value: tableControlsState, setter: setTableControlsState },
  });

  const appliedPageSize = (() => {
    const limitParam = tableControlsState.get(LIMIT_QUERY_NAME);
    if (limitParam && isValidNumber(Number(limitParam))) return Number(limitParam);
    return DEFAULT_PAGE_SIZE;
  })();

  if (appliedPageSize !== DEFAULT_PAGE_SIZE && appliedPageSize !== queryParams?.tablePageSize) {
    setPersistedPageSize(appliedPageSize);
  }

  const {
    data: evaluationData,
    isLoading: tableLoading,
    error,
  } = trpc.dashboard.evaluation.fetchDataEvaluation.useQuery(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    { orgId, ...queryParams! },
    { enabled: !!queryParams, refetchOnWindowFocus: false, refetchOnMount: false },
  );
  const mapMetricByValue = useMemo(() => {
    return new Map<string, ProfileMetric>(
      profileMetricsData?.flatMap((metric) =>
        metric.source === 'Profiles' ? [[normalizeNumericMetric(metric.value), metric]] : [],
      ) ?? [],
    );
  }, [profileMetricsData]);

  const allTableData = useMemo(() => {
    const tableRows = evaluationData?.entries ?? [];
    const sortByTarget = (a: DataEvaluationResult, b: DataEvaluationResult) => {
      const aDisplayedLabel = getDisplayedLabel(a, mapMetricByValue);
      const bDisplayedLabel = getDisplayedLabel(b, mapMetricByValue);
      return sortByStringFn(aDisplayedLabel, bDisplayedLabel, sortDirection);
    };
    const sortByMetric = (a: DataEvaluationResult, b: DataEvaluationResult) => {
      const aMetric = getMetricCellDisplayedLabel(a, mapMetricByValue);
      const bMetric = getMetricCellDisplayedLabel(b, mapMetricByValue);
      return sortByStringFn(aMetric, bMetric, sortDirection);
    };

    if (sortBy === 'segment') {
      return sortByType<TableRow>(tableRows, sortDirection, ['segment']);
    }
    if (sortBy === 'targetColumn') {
      return [...tableRows].sort((a, b) => {
        const byTargetColumn = sortByTarget(a, b);
        const byMetricLabel = sortByMetric(a, b);
        return byTargetColumn || byMetricLabel;
      });
    }
    if (sortBy === 'metric') {
      return [...tableRows].sort((a, b) => {
        const byTargetColumn = sortByTarget(a, b);
        const byMetricLabel = sortByMetric(a, b);
        return byMetricLabel || byTargetColumn;
      });
    }
    if (sortBy) {
      return [...tableRows].sort((a, b) => {
        const fallback = sortDirection === 'DESC' ? Number.MIN_SAFE_INTEGER : Number.MAX_SAFE_INTEGER; // keep NaN always on bottom
        const aTargetColumn =
          a.rowColumns.find((rowColumns) => isValidNumber(rowColumns[sortBy]))?.[sortBy] ?? fallback;
        const bTargetColumn =
          b.rowColumns.find((rowColumns) => isValidNumber(rowColumns[sortBy]))?.[sortBy] ?? fallback;
        return sortByNumberFn(aTargetColumn, bTargetColumn, sortDirection);
      });
    }

    return tableRows;
  }, [evaluationData?.entries, mapMetricByValue, sortBy, sortDirection]);

  const tableData = useMemo(
    () => allTableData.slice(pagingInfo.offset, pagingInfo.offset + pagingInfo.limit),
    [pagingInfo.limit, pagingInfo.offset, allTableData],
  );

  // Resetting the page if some query param changes. tableColumnsDefinition is not likely to affect table rows cardinality
  const metricParams: Partial<DataEvaluationParameters> = { ...(queryParams ?? {}), tableColumnsDefinition: undefined };
  useDeepCompareEffect(() => {
    setPage(0);
  }, [metricParams]);

  const { tableColumnsDefinition, tableRowsDefinition } = parentViewModel.queryParams ?? {};
  const rowSegmentGroup = tableRowsDefinition?.rowSegmentGroup?.[0];
  const rowSelectedSegmentKey =
    rowSegmentGroup && rowSegmentGroup !== OVERALL_SEGMENT_KEY_VALUE ? rowSegmentGroup : null;

  const cellBuilder = useMemo(() => {
    const renderTextCell = (content?: string, className?: string) => {
      return <TextCell className={cx(classes.dataRow, classes.cellPadding, className)}>{content ?? 'N/A'}</TextCell>;
    };

    const renderNumberCell = (value?: number, highlighted?: HighlightColor) => {
      if (!isNumber(value)) {
        return <TextCell className={cx(classes.dataRow, classes.cellPadding, classes.numberCell)}>N/A</TextCell>;
      }
      const displayedNumber = numberToPrecision(value, 4);
      const showTooltip = displayedNumber !== value; // Tooltip if there's hidden decimals
      return (
        <TextCell
          tooltipText={showTooltip ? value.toString() : ''}
          tooltipPosition="bottom-end"
          className={cx(classes.dataRow, classes.cellPadding, classes.numberCell, {
            [classes.minHighlight]: highlighted === 'blue',
            [classes.maxHighlight]: highlighted === 'orange',
          })}
        >
          {displayedNumber}
        </TextCell>
      );
    };

    return {
      renderSegmentCell: (rowIndex: number) => {
        const segmentName = tableData[rowIndex]?.segment;
        const sanitizedSegmentName = rowSelectedSegmentKey
          ? segmentName.replace(`${rowSelectedSegmentKey}=`, '')
          : segmentName;
        return renderTextCell(sanitizedSegmentName);
      },
      renderTargetGroupCell: (rowIndex: number) => {
        const row = tableData[rowIndex];
        const datasetLevelMetric = getMetricTargetFromQueryId(row.queryId) === 'dataset';
        return (
          <ActionsCell
            actions={[
              {
                label: 'Remove column from evaluation',
                disabled: datasetLevelMetric,
                tooltip: datasetLevelMetric ? 'Dataset metrics can be removed on metric cell' : undefined,
                onClick: () => handleMetricDeletion(row.columnName ?? ''),
                type: 'delete',
              },
            ]}
          >
            {renderTextCell(datasetLevelMetric ? 'Dataset' : `column.${row?.columnName}`, classes.noPaddingCell)}
          </ActionsCell>
        );
      },
      renderMetricLabelCell: (rowIndex: number) => {
        const row = tableData[rowIndex];
        const metricObject = getRowMetricObject(row, mapMetricByValue);
        const selectedMetric = { metric: row.metric, column: metricObject?.fixedColumn || undefined };
        return (
          <ActionsCell
            actions={[
              {
                label: 'Remove metric from evaluation',
                onClick: () => handleMetricDeletion(null, selectedMetric),
                type: 'delete',
              },
            ]}
          >
            {renderTextCell(getMetricCellDisplayedLabel(row, mapMetricByValue), classes.noPaddingCell)}
          </ActionsCell>
        );
      },
      renderValueCell: (columnId: string) => (rowIndex: number) => {
        const rowColumns = tableData[rowIndex]?.rowColumns ?? [];
        const foundColumn = rowColumns?.find((c) => Object.keys(c)[0] === columnId);
        const rowColumnValue = foundColumn?.[columnId];
        const getHighlightColor = (): HighlightColor | undefined => {
          const rowValues = rowColumns.flatMap((col) => Object.values(col)) ?? [];
          const [minValue, maxValue] = [Math.min(...rowValues), Math.max(...rowValues)];
          if (maxValue === minValue) return undefined;
          if (rowColumnValue === maxValue && highlightValues.has('max')) return 'orange';
          if (rowColumnValue === minValue && highlightValues.has('min') && maxValue !== minValue) return 'blue';
          return undefined;
        };
        if (!foundColumn) return renderTextCell();
        return renderNumberCell(foundColumn[columnId], getHighlightColor());
      },
    };
  }, [
    classes.cellPadding,
    classes.dataRow,
    classes.maxHighlight,
    classes.minHighlight,
    classes.noPaddingCell,
    classes.numberCell,
    cx,
    handleMetricDeletion,
    highlightValues,
    mapMetricByValue,
    rowSelectedSegmentKey,
    tableData,
  ]);

  const isSegmentColumnDefinition = tableColumnsDefinition?.type === EvaluationColumnDefinitionType.Segment;

  const tableUserDefinedColumns = useMemo(() => {
    if (isSegmentColumnDefinition) {
      if (
        !tableColumnsDefinition.segmentValues?.length ||
        tableColumnsDefinition.groupBySegmentKey === OVERALL_SEGMENT_KEY_VALUE
      )
        return [{ label: 'All data', value: 'All data' }];
      return tableColumnsDefinition.segmentValues.map((segmentValue) => ({
        label: segmentValue,
        value: `${tableColumnsDefinition.groupBySegmentKey ?? ''}=${segmentValue}`,
      }));
    }
    return (
      refProfilesData?.filter((ref) => (tableColumnsDefinition?.referenceProfileIds ?? []).includes(ref.value)) ?? []
    );
  }, [isSegmentColumnDefinition, refProfilesData, tableColumnsDefinition]);

  const getColumns = useCallback(() => {
    const metricValueCells =
      tableUserDefinedColumns?.map((tableColumn) => {
        return {
          cell: cellBuilder.renderValueCell(tableColumn.value),
          headerText: tableColumn.label,
          minWidth: 'fit-content',
          maxWidth: `max(${METRIC_COLUMN_WIDTH}px, ${40 / tableUserDefinedColumns.length}vw)`,
          columnKey: tableColumn.value,
          sortType: 'number' as SortType,
        };
      }) ?? [];

    if (widgetType === 'dataComparison') {
      const headerText = rowSelectedSegmentKey || 'Segment';
      return [
        {
          cell: cellBuilder.renderSegmentCell,
          headerText,
          minWidth: 'fit-content',
          maxWidth: `max(calc(90vw - ${METRIC_COLUMN_WIDTH}px - ${
            METRIC_COLUMN_WIDTH * (tableUserDefinedColumns?.length ?? 0)
          }px), ${METRIC_COLUMN_WIDTH + 100}px`,
          columnKey: 'segment',
          sortType: 'text' as SortType,
        },
        ...metricValueCells,
      ];
    }

    return [
      {
        cell: cellBuilder.renderTargetGroupCell,
        headerText: 'Metric target',
        minWidth: 'fit-content',
        maxWidth: `max(calc(40vw - ${METRIC_COLUMN_WIDTH}px - ${
          METRIC_COLUMN_WIDTH * ((tableUserDefinedColumns?.length ?? 0) + 1)
        }px), 600px)`,
        columnKey: 'targetColumn',
        sortType: 'text' as SortType,
      },
      {
        cell: cellBuilder.renderMetricLabelCell,
        headerText: 'Metric',
        minWidth: 'fit-content',
        maxWidth: `max(calc(40vw - ${METRIC_COLUMN_WIDTH}px - ${
          METRIC_COLUMN_WIDTH * ((tableUserDefinedColumns?.length ?? 0) + 1)
        }px), 600px)`,
        columnKey: 'metric',
        sortType: 'text' as SortType,
      },
      ...metricValueCells,
    ];
  }, [cellBuilder, rowSelectedSegmentKey, tableUserDefinedColumns, widgetType]);

  const onSortDirectionChange = (key: string) => {
    return (direction: SortDirectionType) => {
      setSort(key, direction);
    };
  };

  const getSortableHeaderProps = (key: string, sortType: SortType) => {
    return {
      sortDirection: sortBy === key ? sortDirection : undefined,
      sortType,
      onSortDirectionChange: onSortDirectionChange(key),
    };
  };

  const isTableDataLoading = tableLoading && !!queryParams;

  const toggleHighlightOption = (option: HighlightValuesType) => {
    setHighlightValues((prev) => {
      const newState = new Set(prev);
      if (newState.has(option)) {
        newState.delete(option);
      } else {
        newState.add(option);
      }
      return newState;
    });
  };

  const downloadTableData = useCallback(() => {
    if (!queryParams || !allTableData.length) return;
    const translatedData = translateDataForCsvExporting({
      data: allTableData,
      type: widgetType,
      queryParams,
      profileMetricsMap: mapMetricByValue,
      refProfilesLabels: refProfilesData,
    });
    const filename = (() => {
      const nameEntries = [displayName, queryParams.resourceId];
      nameEntries.push(widgetType === 'dataComparison' ? 'data-comparison' : 'metric-comparison');
      nameEntries.push(new Date().toISOString());
      return nameEntries.join('-');
    })();
    downloadCsvData({ data: translatedData, filename });
  }, [allTableData, displayName, mapMetricByValue, queryParams, refProfilesData, widgetType]);

  return {
    table: {
      allTableData,
      data: tableData,
      loading: isTableDataLoading,
      error,
      getColumns,
      getSortableHeaderProps,
      pagingInfo,
      customPaginationState: { value: tableControlsState, setter: setTableControlsState },
    },
    tableUserDefinedColumns,
    isSegmentColumnDefinition,
    highlightState: {
      value: highlightValues,
      onChange: toggleHighlightOption,
    },
    mapMetricByValue,
    downloadTableData,
  };
};

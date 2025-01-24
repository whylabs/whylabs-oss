import { createStyles } from '@mantine/core';
import { BuiltinProfileMetric } from '@whylabs/data-service-node-client';
import { DataEvaluationResult } from '@whylabs/data-service-node-client/dist/api';
import { Colors } from '~/assets/Colors';
import { ChartCategorySeries } from '~/components/chart/types/chart-types';
import { DashboardDataEvaluationTypes } from '~/routes/:orgId/dashboard/components/custom-dashboard/types';
import { metricObjectToSelectFormat } from '~/routes/:orgId/dashboard/components/data-evaluation/utils';
import { AnalysisTargetLevel } from '~server/graphql/generated/graphql';
import { CUSTOM_METRIC_VALUE_SEPARATOR, ProfileMetric } from '~server/graphql/resolvers/types/metrics';
import {
  DATASET_METRIC_QUERY_ID_PREFIX,
  DataEvaluationParameters,
  EvaluationAggregationType,
} from '~server/trpc/dashboard/types/data-evalutation-types';

export const useEvaluationCommonStyles = createStyles({
  modalTitleWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    height: 18,
  },
  modalTitle: {
    color: 'black',
    fontSize: 16,
    fontWeight: 400,
    lineHeight: 1,
  },
  modalBold: {
    fontWeight: 700,
    color: 'black',
  },
  topComponent: {
    display: 'flex',
    flexDirection: 'column',
    gap: 15,
    width: '100%',
  },
  alert: {
    color: Colors.secondaryLight1000,
    fontSize: 14,
    fontWeight: 400,
    lineHeight: 1.57,
    letterSpacing: '-0.28px',
  },
  sideControlButton: {
    color: Colors.secondaryLight1000,
    fontWeight: 600,
    lineHeight: 1.53,
    fontSize: 13,
    '&:disabled': {
      color: Colors.brandSecondary600,
      background: Colors.secondaryLight200,
    },
  },
  lightDisabledButton: {
    '&:disabled': {
      color: Colors.brandSecondary700,
      background: Colors.secondaryLight300,
    },
  },
  buttonText: {
    color: Colors.secondaryLight1000,
    fontSize: 13,
    fontWeight: 600,
    lineHeight: 1.53,
    letterSpacing: '-0.13px',
  },
  leftPositionedButton: {
    marginRight: 'auto',
    paddingLeft: 17,
    paddingRight: 17,
  },
  flexRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  flexSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
    flex: 1,
  },
  gap10: {
    gap: 10,
  },
  sectionLabel: {
    color: Colors.secondaryLight900,
    fontWeight: 600,
    lineHeight: 1.42,
    fontSize: 14,
    height: 18,
  },
  sectionWrapper: {
    display: 'flex',
    gap: 4,
  },
  errorIndicator: {
    width: 3,
    background: Colors.red,
    borderRadius: 4,
  },
  errorMessage: {
    fontSize: 12,
    color: Colors.brandRed4,
  },
});

const mapSeriesColorByIndex = new Map([
  [0, '#005566'],
  [1, '#2683C9'],
  [2, '#44C0E7'],
  [3, '#F5843C'],
  [4, '#FFDE1E'],
]);

export type EvaluationGraph = {
  metricLabel: string;
  numericMetric: string;
  series: ChartCategorySeries[];
  categories: string[];
};

const translateCategoricalGraph = (
  chartData: DataEvaluationResult[],
  isDataComparison: boolean,
  seriesGroups: { label: string; value: string }[],
) => {
  const mappedRows = new Map(
    chartData.map(({ segment, rowColumns, columnName, queryId }) => {
      const group = (() => {
        if (isDataComparison) return segment;
        const isDatasetMetric = getMetricTargetFromQueryId(queryId) === 'dataset';
        return isDatasetMetric ? 'Dataset' : columnName || 'Dataset';
      })();
      return [group, rowColumns];
    }),
  );
  const categories = [...mappedRows.keys()];
  const series: ChartCategorySeries[] = seriesGroups.map((tableColumn, index) => ({
    type: 'column',
    name: tableColumn.label,
    color: mapSeriesColorByIndex.get(index),
    data: [...mappedRows.values()].map(
      (rowColumns) => new Map(rowColumns.flatMap((o) => Object.entries(o))).get(tableColumn.value) ?? null,
    ),
  }));
  const numericMetric = chartData?.[0]?.metric ?? 'Unknown';
  const isDatasetMetric = getMetricTargetFromQueryId(chartData?.[0]?.queryId) === 'dataset';
  const isCustomMetrics = !!(chartData?.[0]?.columnName && isDatasetMetric);
  const metricLabel = isCustomMetrics
    ? `${chartData?.[0]?.metric}${CUSTOM_METRIC_VALUE_SEPARATOR}${chartData?.[0]?.columnName}`
    : numericMetric;
  return {
    categories,
    metricLabel,
    numericMetric,
    series,
  };
};

export const getMetricTargetFromQueryId = (queryId: string): 'dataset' | 'column' => {
  if (queryId?.startsWith(DATASET_METRIC_QUERY_ID_PREFIX)) return 'dataset';
  return 'column';
};

/*
 * Data comparison will display one graph, rather metrics comparison will display one graph per metric
 * */
export const translateEvaluationDataToGraphs = (
  data: DataEvaluationResult[],
  /* can be segments or reference profiles */
  seriesGroups: { label: string; value: string }[],
  widgetType: DashboardDataEvaluationTypes,
): EvaluationGraph[] => {
  const isDataComparison = widgetType === 'dataComparison';

  if (isDataComparison) {
    // all rows are related to the same resource column and metric on data comparison.
    // graph categories must be the row segments
    const graph = translateCategoricalGraph(data, isDataComparison, seriesGroups);
    return [graph];
  }
  // each row is related to some resource column and metric on metric comparison.
  // each metric will generate a different categorical graph.
  // graph categories must be the resource columns
  const graphs = new Map<string, DataEvaluationResult[]>([]);
  data.forEach((row) => {
    const isDatasetMetric = getMetricTargetFromQueryId(row.queryId) === 'dataset';
    const metricId = isDatasetMetric
      ? metricObjectToSelectFormat({ metric: row.metric, column: row.columnName })
      : row.metric;
    const currentMetricData = graphs.get(metricId);
    graphs.set(metricId, [...(currentMetricData ?? []), row]);
  });

  return [...graphs.values()].map((metricData) => translateCategoricalGraph(metricData, false, seriesGroups));
};

export const normalizeNumericMetric = (metric: string): string => {
  const lowerCaseMetric = metric.toLowerCase();
  // data-service metric name retro-compatibility
  if (lowerCaseMetric === 'classification_auroc') return BuiltinProfileMetric.ClassificationAuc;
  return lowerCaseMetric;
};

export const isDatasetLevelMetric = (metric: ProfileMetric) =>
  metric.targetLevel === AnalysisTargetLevel.Dataset || metric.fixedColumn;

export const getRowMetricObject = (row: DataEvaluationResult, profileMetricsMap: Map<string, ProfileMetric>) => {
  const { metric, columnName } = row;
  const isColumnMetric = getMetricTargetFromQueryId(row.queryId) === 'column';
  if (isColumnMetric) return profileMetricsMap.get(metric.toLowerCase());
  const metricId = metricObjectToSelectFormat({ metric, column: columnName }).toLowerCase();
  return profileMetricsMap.get(metricId) ?? profileMetricsMap.get(metric.toLowerCase());
};

type ComparisonDataForCsvExportingProps = {
  data: DataEvaluationResult[];
  type: DashboardDataEvaluationTypes;
  queryParams: Pick<DataEvaluationParameters, 'tableRowsDefinition' | 'type'>;
  profileMetricsMap: Map<string, ProfileMetric>;
  // the backend return ref-profile ID, pass the labels to display those on csv headers
  refProfilesLabels?: { value: string; label: string }[];
};
export const translateDataForCsvExporting = ({
  data,
  type,
  queryParams,
  refProfilesLabels,
  profileMetricsMap,
}: ComparisonDataForCsvExportingProps) => {
  const dataComparisonRowSegment = queryParams.tableRowsDefinition?.rowSegmentGroup[0];
  const getComparisonTargetLabel = (comparisonTarget: string) => {
    const isRefProfileComparison = queryParams.type === EvaluationAggregationType.ReferenceProfile;
    if (isRefProfileComparison) {
      return refProfilesLabels?.find(({ value }) => comparisonTarget === value)?.label ?? comparisonTarget;
    }
    const isSegment = comparisonTarget.includes('=');
    return isSegment ? comparisonTarget.split('=')[1] : comparisonTarget;
  };
  return data.map((row) => {
    const csvRow: Record<string, string | number> = {};
    if (type === 'dataComparison') {
      // Data comparison table have the segment column
      csvRow[dataComparisonRowSegment ?? 'Segment'] = dataComparisonRowSegment
        ? row.segment.replace(`${dataComparisonRowSegment}=`, '')
        : row.segment;
    }
    if (type === 'metricComparison') {
      // Metric comparison have target and metric columns
      const metricObject = getRowMetricObject(row, profileMetricsMap);
      const datasetLevelMetric = metricObject && isDatasetLevelMetric(metricObject);
      csvRow['Metric target'] = datasetLevelMetric ? 'Dataset' : `column.${row.columnName || 'unknown'}`;
      const isCustomMetric = datasetLevelMetric && metricObject?.fixedColumn;
      csvRow.Metric = isCustomMetric
        ? `${metricObject?.label ?? metricObject?.fixedColumn}.${row.metric}`
        : metricObject?.label ?? row.metric;
    }
    row.rowColumns.forEach((column) => {
      // comparisonTarget may be either ref-profile-id or segment value
      const [comparisonTarget, metricValue] = Object.entries(column)[0];
      const targetLabel = getComparisonTargetLabel(comparisonTarget);
      csvRow[targetLabel] = metricValue;
    });

    return csvRow;
  });
};

export const getDisplayedLabel = (row: DataEvaluationResult, mapMetricByValue: Map<string, ProfileMetric>) => {
  const metricObject = getRowMetricObject(row, mapMetricByValue);
  const datasetLevelMetric = !!(metricObject && isDatasetLevelMetric(metricObject));
  return datasetLevelMetric ? 'Dataset' : `column.${row?.columnName}`;
};

export const getMetricCellDisplayedLabel = (
  row: DataEvaluationResult,
  mapMetricByValue: Map<string, ProfileMetric>,
) => {
  const metricObject = getRowMetricObject(row, mapMetricByValue);
  const isColumnMetric = getMetricTargetFromQueryId(row.queryId) === 'column';
  const metric = row?.metric;
  if (isColumnMetric || !metricObject?.fixedColumn) {
    return metricObject?.label ?? metric;
  }
  const metricLabel = metricObject?.label ?? metricObject?.fixedColumn;
  return metricLabel ? `${metricLabel}.${metric}` : metric;
};

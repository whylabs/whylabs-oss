import { BuiltinProfileMetric, DataEvaluationResult } from '@whylabs/data-service-node-client/dist/api';
import {
  translateDataForCsvExporting,
  translateEvaluationDataToGraphs,
} from '~/routes/:orgId/dashboard/components/data-evaluation/components/utils';
import { AnalysisMetric, AnalysisTargetLevel, MetricDataType } from '~server/graphql/generated/graphql';
import { ProfileMetric } from '~server/graphql/resolvers/types/metrics';
import {
  COLUMN_METRIC_QUERY_ID_PREFIX,
  DATASET_METRIC_QUERY_ID_PREFIX,
  EvaluationAggregationType,
} from '~server/trpc/dashboard/types/data-evalutation-types';

const DATA_COMPARISON_MOCK: DataEvaluationResult[] = [
  {
    segment: 'purpose=car',
    columnName: 'foo',
    metric: BuiltinProfileMetric.Mean,
    rowColumns: [{ 'ref-profile-1': 3 }, { 'ref-profile-2': 1.3 }],
    queryId: `${COLUMN_METRIC_QUERY_ID_PREFIX}1`,
  },
  {
    segment: 'purpose=wedding',
    columnName: 'foo',
    metric: BuiltinProfileMetric.Mean,
    rowColumns: [{ 'ref-profile-1': 5 }, { 'ref-profile-2': 2 }],
    queryId: `${COLUMN_METRIC_QUERY_ID_PREFIX}2`,
  },
];

const SEGMENT_DATA_COMPARISON_MOCK: DataEvaluationResult[] = [
  {
    segment: 'purpose=car',
    columnName: 'foo',
    metric: BuiltinProfileMetric.Count,
    rowColumns: [{ 'verification_status=Verified': 32 }, { 'verification_status=Not verified': 6 }],
    queryId: `${COLUMN_METRIC_QUERY_ID_PREFIX}1`,
  },
  {
    segment: 'purpose=wedding',
    columnName: 'foo',
    metric: BuiltinProfileMetric.Count,
    rowColumns: [{ 'verification_status=Verified': 52 }, { 'verification_status=Not verified': 51 }],
    queryId: `${COLUMN_METRIC_QUERY_ID_PREFIX}1`,
  },
];

const METRIC_COMPARISON_MOCK: DataEvaluationResult[] = [
  {
    segment: 'All data',
    columnName: 'foo',
    metric: BuiltinProfileMetric.Count,
    rowColumns: [{ 'ref-profile-1': 6 }, { 'ref-profile-2': 7 }],
    queryId: `${COLUMN_METRIC_QUERY_ID_PREFIX}1`,
  },
  {
    segment: 'All data',
    columnName: 'bar',
    metric: BuiltinProfileMetric.Count,
    rowColumns: [{ 'ref-profile-1': 2 }, { 'ref-profile-2': 4 }],
    queryId: `${COLUMN_METRIC_QUERY_ID_PREFIX}2`,
  },
  {
    segment: 'All data',
    columnName: 'foo',
    metric: BuiltinProfileMetric.Median,
    rowColumns: [{ 'ref-profile-1': 5.6 }, { 'ref-profile-2': 2.6 }],
    queryId: `${COLUMN_METRIC_QUERY_ID_PREFIX}3`,
  },
  // dataset and custom metrics
  {
    segment: 'All data',
    columnName: '',
    metric: BuiltinProfileMetric.ClassificationAccuracy,
    rowColumns: [{ 'ref-profile-1': 0.83 }, { 'ref-profile-2': 0.91 }],
    queryId: `${DATASET_METRIC_QUERY_ID_PREFIX}1`,
  },
  {
    segment: 'All data',
    columnName: 'precision_k_5',
    metric: BuiltinProfileMetric.Mean,
    rowColumns: [{ 'ref-profile-1': 4 }, { 'ref-profile-2': 2.5 }],
    queryId: `${DATASET_METRIC_QUERY_ID_PREFIX}2`,
  },
];

const metricsMapMock = new Map<string, ProfileMetric>([
  [
    AnalysisMetric.ClassificationAccuracy.toLowerCase(),
    {
      group: 'DATASET',
      targetLevel: AnalysisTargetLevel.Dataset,
      dataType: MetricDataType.Float,
      label: 'Accuracy',
      value: AnalysisMetric.ClassificationAccuracy,
      source: 'Profiles',
    },
  ],
  [
    AnalysisMetric.Count.toLowerCase(),
    {
      group: 'COLUMN METRICS',
      targetLevel: AnalysisTargetLevel.Column,
      dataType: MetricDataType.Integer,
      label: 'Total count',
      value: AnalysisMetric.Count,
      source: 'Profiles',
    },
  ],
  [
    `${AnalysisMetric.Mean}::precision_k_5`.toLowerCase(),
    {
      group: 'DATASET',
      targetLevel: AnalysisTargetLevel.Column,
      fixedColumn: 'precision_k_5',
      dataType: MetricDataType.Float,
      label: 'Precision K5',
      value: AnalysisMetric.Mean,
      source: 'Profiles',
    },
  ],
  [
    AnalysisMetric.Median.toLowerCase(),
    {
      group: 'COLUMN METRICS',
      targetLevel: AnalysisTargetLevel.Column,
      dataType: MetricDataType.Float,
      label: 'Median value',
      value: AnalysisMetric.Median,
      source: 'Profiles',
    },
  ],
]);

describe('testing evaluation table data translation to graph', () => {
  it('should translate dataComparison data to a single graph', () => {
    const graph = translateEvaluationDataToGraphs(
      DATA_COMPARISON_MOCK,
      [
        { label: 'ref-profile-1', value: 'ref-profile-1' },
        { label: 'ref-profile-2', value: 'ref-profile-2' },
      ],
      'dataComparison',
    );
    expect(graph.length).toBe(1);
    expect(graph[0]).toStrictEqual({
      metricLabel: BuiltinProfileMetric.Mean,
      numericMetric: BuiltinProfileMetric.Mean,
      categories: ['purpose=car', 'purpose=wedding'],
      series: [
        {
          color: '#005566',
          data: [3, 5],
          name: 'ref-profile-1',
          type: 'column',
        },
        {
          color: '#2683C9',
          data: [1.3, 2],
          name: 'ref-profile-2',
          type: 'column',
        },
      ],
    });
  });

  it.skip('should translate metricComparison data to one graph per column-target metric', () => {
    const graph = translateEvaluationDataToGraphs(
      METRIC_COMPARISON_MOCK.slice(0, 3),
      [
        { label: 'ref-profile-1', value: 'ref-profile-1' },
        { label: 'ref-profile-2', value: 'ref-profile-2' },
      ],
      'metricComparison',
    );
    expect(graph.length).toBe(4);
    expect(graph).toStrictEqual([
      {
        categories: ['foo', 'bar'],
        metricLabel: BuiltinProfileMetric.Count,
        numericMetric: BuiltinProfileMetric.Count,
        series: [
          {
            color: '#005566',
            data: [6, 2],
            name: 'ref-profile-1',
            type: 'column',
          },
          {
            color: '#2683C9',
            data: [7, 4],
            name: 'ref-profile-2',
            type: 'column',
          },
        ],
      },
      {
        categories: ['foo'],
        metricLabel: BuiltinProfileMetric.Median,
        numericMetric: BuiltinProfileMetric.Median,
        series: [
          {
            color: '#005566',
            data: [5.6],
            name: 'ref-profile-1',
            type: 'column',
          },
          {
            color: '#2683C9',
            data: [2.6],
            name: 'ref-profile-2',
            type: 'column',
          },
        ],
      },
    ]);
  });
  it('should translate metricComparison data to one graph per dataset-target metric', () => {
    const graph = translateEvaluationDataToGraphs(
      METRIC_COMPARISON_MOCK,
      [
        { label: 'ref-profile-1', value: 'ref-profile-1' },
        { label: 'ref-profile-2', value: 'ref-profile-2' },
      ],
      'metricComparison',
    );
    expect(graph.length).toBe(4);
    expect(graph).toStrictEqual([
      {
        categories: ['foo', 'bar'],
        metricLabel: BuiltinProfileMetric.Count,
        numericMetric: BuiltinProfileMetric.Count,
        series: [
          {
            color: '#005566',
            data: [6, 2],
            name: 'ref-profile-1',
            type: 'column',
          },
          {
            color: '#2683C9',
            data: [7, 4],
            name: 'ref-profile-2',
            type: 'column',
          },
        ],
      },
      {
        categories: ['foo'],
        metricLabel: BuiltinProfileMetric.Median,
        numericMetric: BuiltinProfileMetric.Median,
        series: [
          {
            color: '#005566',
            data: [5.6],
            name: 'ref-profile-1',
            type: 'column',
          },
          {
            color: '#2683C9',
            data: [2.6],
            name: 'ref-profile-2',
            type: 'column',
          },
        ],
      },
      {
        categories: ['Dataset'],
        metricLabel: BuiltinProfileMetric.ClassificationAccuracy,
        numericMetric: BuiltinProfileMetric.ClassificationAccuracy,
        series: [
          {
            color: '#005566',
            data: [0.83],
            name: 'ref-profile-1',
            type: 'column',
          },
          {
            color: '#2683C9',
            data: [0.91],
            name: 'ref-profile-2',
            type: 'column',
          },
        ],
      },
      {
        categories: ['Dataset'],
        metricLabel: `mean::precision_k_5`,
        numericMetric: BuiltinProfileMetric.Mean,
        series: [
          {
            color: '#005566',
            data: [4],
            name: 'ref-profile-1',
            type: 'column',
          },
          {
            color: '#2683C9',
            data: [2.5],
            name: 'ref-profile-2',
            type: 'column',
          },
        ],
      },
    ]);
  });
});

describe('testing comparison data translator for csv-export format', () => {
  it('should translate ref-profile dataComparison data to csv-export format', () => {
    const translatedData = translateDataForCsvExporting({
      data: DATA_COMPARISON_MOCK,
      type: 'dataComparison',
      queryParams: {
        type: EvaluationAggregationType.ReferenceProfile,
        tableRowsDefinition: {
          rowSegmentGroup: ['purpose'],
          inclusionMode: ['individual'],
        },
      },
      refProfilesLabels: [
        { label: 'Readable name profile 1', value: 'ref-profile-1' },
        { label: 'Readable name profile 2', value: 'ref-profile-2' },
      ],
      profileMetricsMap: metricsMapMock,
    });

    expect(translatedData).toStrictEqual([
      {
        purpose: 'car',
        'Readable name profile 1': 3,
        'Readable name profile 2': 1.3,
      },
      {
        purpose: 'wedding',
        'Readable name profile 1': 5,
        'Readable name profile 2': 2,
      },
    ]);
  });

  it('should translate segments dataComparison data to csv-export format', () => {
    const translatedData = translateDataForCsvExporting({
      data: SEGMENT_DATA_COMPARISON_MOCK,
      type: 'dataComparison',
      queryParams: {
        type: EvaluationAggregationType.DateRange,
        tableRowsDefinition: {
          rowSegmentGroup: ['purpose'],
          inclusionMode: ['individual'],
        },
      },
      profileMetricsMap: metricsMapMock,
    });

    expect(translatedData).toStrictEqual([
      {
        purpose: 'car',
        Verified: 32,
        'Not verified': 6,
      },
      {
        purpose: 'wedding',
        Verified: 52,
        'Not verified': 51,
      },
    ]);
  });

  /// metric comparison

  it('should translate ref-profile metricComparison data to csv-export format', () => {
    const translatedData = translateDataForCsvExporting({
      data: METRIC_COMPARISON_MOCK,
      type: 'metricComparison',
      queryParams: {
        type: EvaluationAggregationType.ReferenceProfile,
      },
      refProfilesLabels: [
        { label: 'Readable name profile 1', value: 'ref-profile-1' },
        { label: 'Readable name profile 2', value: 'ref-profile-2' },
      ],
      profileMetricsMap: metricsMapMock,
    });

    expect(translatedData).toStrictEqual([
      {
        'Metric target': 'column.foo',
        Metric: 'Total count',
        'Readable name profile 1': 6,
        'Readable name profile 2': 7,
      },
      {
        'Metric target': 'column.bar',
        Metric: 'Total count',
        'Readable name profile 1': 2,
        'Readable name profile 2': 4,
      },
      {
        'Metric target': 'column.foo',
        Metric: 'Median value',
        'Readable name profile 1': 5.6,
        'Readable name profile 2': 2.6,
      },
      {
        'Metric target': 'Dataset',
        Metric: 'Accuracy',
        'Readable name profile 1': 0.83,
        'Readable name profile 2': 0.91,
      },
      {
        'Metric target': 'Dataset',
        Metric: 'Precision K5.mean',
        'Readable name profile 1': 4,
        'Readable name profile 2': 2.5,
      },
    ]);
  });
});

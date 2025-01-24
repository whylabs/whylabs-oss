import { Analyzer, Monitor } from '../../../../schemas/generated/monitor-schema';
import { ColumnSchema } from '../../datasources/helpers/entity-schema';
import { PartialMonitorConfig } from '../coverage';

const commonMonitorConfigFields: Monitor = {
  displayName: 'test-display-name',
  analyzerIds: [],
  id: 'test',
  schedule: {
    type: 'immediate',
  },
  severity: 2,
  mode: {
    type: 'DIGEST',
    creationTimeOffset: 'P1D',
    datasetTimestampOffset: 'P7D',
  },
  actions: [],
};

const commonAnalyzerConfigFields: Analyzer = {
  schedule: {
    type: 'fixed',
    cadence: 'daily',
  },
  targetMatrix: { type: 'dataset' },
  config: {
    metric: 'frequent_items',
    type: 'drift',
    algorithm: 'hellinger',
    threshold: 0.9,
    minBatchSize: 1,
    baseline: {
      type: 'TrailingWindow',
      size: 8,
    },
  },
};

export const monitorConfig = {
  ...commonMonitorConfigFields,
  id: 'brainy-aliceblue-goshawk-6844',
  analyzerIds: ['brainy-aliceblue-goshawk-6844-analyzer'],
};

export const analyzerConfig = {
  ...commonAnalyzerConfigFields,
  id: 'brainy-aliceblue-goshawk-6844-analyzer',
  targetMatrix: {
    segments: [],
    type: 'column',
    include: ['group:discrete'],
    exclude: ['group:output', 'issue_d'],
  },
};

export const columnsSchema: ColumnSchema[] = [
  {
    dataType: 'fractional',
    discreteness: 'continuous',
    classifier: 'input',
    column: 'collection_recovery_fee',
    tags: [],
  },
  {
    dataType: 'fractional',
    discreteness: 'continuous',
    classifier: 'input',
    column: 'acc_now_delinq',
    tags: [],
  },
  {
    dataType: 'fractional',
    discreteness: 'continuous',
    classifier: 'input',
    column: 'num_sats',
    tags: [],
  },
  {
    dataType: 'fractional',
    discreteness: 'continuous',
    classifier: 'input',
    column: 'total_rec_int',
    tags: [],
  },
  {
    dataType: 'fractional',
    discreteness: 'continuous',
    classifier: 'input',
    column: 'mths_since_recent_revol_delinq',
    tags: [],
  },
  {
    dataType: 'boolean',
    discreteness: 'discrete',
    classifier: 'input',
    column: 'zip_code',
    tags: [],
  },
  {
    dataType: 'string',
    discreteness: 'discrete',
    classifier: 'input',
    column: 'initial_list_status',
    tags: [],
  },
  {
    dataType: 'fractional',
    discreteness: 'continuous',
    classifier: 'output',
    column: 'test (output)',
    tags: [],
  },
  {
    dataType: 'string',
    discreteness: 'discrete',
    classifier: 'input',
    column: 'debt_settlement_flag',
    tags: [],
  },
  {
    dataType: 'integer',
    discreteness: 'continuous',
    classifier: 'input',
    column: 'issue_d',
    tags: [],
  },
];

export const mockedSchema = { entitySchema: { columns: columnsSchema }, orgId: 'org-test', datasetId: 'model-test' };

export const mockedMonitorWithEntitySchema: PartialMonitorConfig = {
  monitors: [
    {
      ...commonMonitorConfigFields,
      id: 'test-monitor-discrete-exclude-issue_d',
      analyzerIds: ['test-monitor-discrete-exclude-issue_d-analyzer'],
    },
    {
      ...commonMonitorConfigFields,
      id: 'test-monitor-continuous-exclude-issue_d',
      analyzerIds: ['test-monitor-continuous-exclude-issue_d-analyzer'],
    },
    {
      ...commonMonitorConfigFields,
      id: 'test-monitor-output',
      analyzerIds: ['test-monitor-output-analyzer'],
    },
    {
      ...commonMonitorConfigFields,
      id: 'test-monitor-all-exclude-issue_d',
      analyzerIds: ['test-monitor-all-exclude-issue_d-analyzer'],
    },
    {
      ...commonMonitorConfigFields,
      id: 'test-monitor-string',
      analyzerIds: ['test-monitor-string-analyzer'],
    },
    {
      ...commonMonitorConfigFields,
      id: 'test-monitor-input',
      analyzerIds: ['test-monitor-input-analyzer'],
    },
    {
      ...commonMonitorConfigFields,
      id: 'test-monitor-dataset',
      analyzerIds: ['test-monitor-dataset-analyzer'],
    },
    {
      ...commonMonitorConfigFields,
      id: 'test-monitor-dataset-overall-segmented',
      analyzerIds: ['test-monitor-dataset-overall-segmented-analyzer'],
    },
    {
      ...commonMonitorConfigFields,
      id: 'test-monitor-dataset-segmented',
      analyzerIds: ['test-monitor-dataset-segmented-analyzer'],
    },
    {
      ...commonMonitorConfigFields,
      id: 'test-monitor-dataset-segment-excluded',
      analyzerIds: ['test-monitor-dataset-segment-excluded-analyzer'],
    },
    {
      ...commonMonitorConfigFields,
      id: 'test-monitor-dataset-purpose-segment-wildcard-excluded-credit-card',
      analyzerIds: ['test-monitor-dataset-purpose-segment-wildcard-excluded-credit-card-analyzer'],
    },
  ],
  analyzers: [
    {
      ...commonAnalyzerConfigFields,
      id: 'test-monitor-discrete-exclude-issue_d-analyzer',
      targetMatrix: {
        segments: [],
        type: 'column',
        include: ['group:discrete'],
        exclude: ['group:output', 'issue_d'],
      },
    },
    {
      ...commonAnalyzerConfigFields,
      id: 'test-monitor-continuous-exclude-issue_d-analyzer',
      targetMatrix: {
        segments: [],
        type: 'column',
        include: ['group:continuous'],
        exclude: ['issue_d'],
      },
    },
    {
      ...commonAnalyzerConfigFields,
      id: 'test-monitor-output-analyzer',
      targetMatrix: {
        segments: [],
        type: 'column',
        include: ['group:output'],
        exclude: [],
      },
    },
    {
      ...commonAnalyzerConfigFields,
      id: 'test-monitor-all-exclude-issue_d-analyzer',
      targetMatrix: {
        segments: [],
        type: 'column',
        include: ['*'],
        exclude: ['issue_d'],
      },
    },
    {
      ...commonAnalyzerConfigFields,
      id: 'test-monitor-string-analyzer',
      targetMatrix: {
        segments: [],
        type: 'column',
        include: ['group:str'],
        exclude: [],
      },
    },
    {
      ...commonAnalyzerConfigFields,
      id: 'test-monitor-input-analyzer',
      targetMatrix: {
        segments: [],
        type: 'column',
        include: ['group:input'],
        exclude: [],
      },
    },
    {
      ...commonAnalyzerConfigFields,
      id: 'test-monitor-dataset-analyzer',
      targetMatrix: {
        type: 'dataset',
      },
    },
    {
      ...commonAnalyzerConfigFields,
      id: 'test-monitor-dataset-segmented-analyzer',
      targetMatrix: {
        type: 'dataset',
        segments: [
          {
            tags: [
              { key: 'purpose', value: 'car' },
              { key: 'verification_status', value: 'verification_status' },
            ],
          },
        ],
        excludeSegments: [],
      },
    },
    {
      ...commonAnalyzerConfigFields,
      id: 'test-monitor-dataset-overall-segmented-analyzer',
      targetMatrix: {
        type: 'dataset',
        segments: [
          {
            tags: [],
          },
          {
            tags: [{ key: 'purpose', value: 'other' }],
          },
        ],
        excludeSegments: [],
      },
    },
    {
      ...commonAnalyzerConfigFields,
      id: 'test-monitor-dataset-segment-excluded-analyzer',
      targetMatrix: {
        type: 'dataset',
        excludeSegments: [
          {
            tags: [{ key: 'purpose', value: 'credit_card' }],
          },
        ],
      },
    },
    {
      ...commonAnalyzerConfigFields,
      id: 'test-monitor-dataset-purpose-segment-wildcard-excluded-credit-card-analyzer',
      targetMatrix: {
        type: 'dataset',
        segments: [
          {
            tags: [{ key: 'purpose', value: '*' }],
          },
        ],
        excludeSegments: [
          {
            tags: [{ key: 'purpose', value: 'credit_card' }],
          },
        ],
      },
    },
  ],
  entitySchema: {
    columns: {
      issue_d: {
        dataType: 'integer',
        discreteness: 'continuous',
        classifier: 'input',
        tags: [],
      },
      debt_settlement_flag: {
        dataType: 'string',
        discreteness: 'discrete',
        classifier: 'input',
        tags: [],
      },
      'test (output)': {
        dataType: 'fractional',
        discreteness: 'continuous',
        classifier: 'output',
        tags: [],
      },
    },
    metadata: {
      author: 'test',
    },
  },
};

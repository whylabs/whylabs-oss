import { ResourceState } from 'pages/model-page/context/ResourceContext';
import { AssetCategory, ModelType, TimePeriod } from 'generated/graphql';

type ResourceStateMock = ResourceState['resource'];

export const diffConfigDefinitionMock = {
  title: 'DiffConfig',
  description: 'Detecting the differences between two numerical metrics.',
  type: 'object',
  properties: {
    schemaVersion: {
      title: 'SchemaVersion',
      description: 'The schema version of an algorithm. Typically this valueis not required.',
      type: 'integer',
    },
    params: {
      title: 'Params',
      description: 'Extra parameters for the algorithm',
      type: 'object',
      additionalProperties: {
        type: 'string',
        maxLength: 1000,
      },
    },
    metric: {
      title: 'Metric',
      description: 'The target metric. This field cannot be change once the analyzer is created.',
      anyOf: [
        {
          $ref: '#/definitions/DatasetMetric',
        },
        {
          $ref: '#/definitions/SimpleColumnMetric',
        },
        {
          type: 'string',
          maxLength: 100,
        },
      ],
    },
    type: {
      title: 'Type',
      enum: ['diff'],
      type: 'string',
    },
    mode: {
      $ref: '#/definitions/DiffMode',
    },
    thresholdType: {
      $ref: '#/definitions/ThresholdType',
    },
    threshold: {
      title: 'Threshold',
      description:
        "The minimum threshold that will trigger an anomaly. The monitor detect the difference betweenthe target's metric and the baseline metric. Both of these metrics MUST be in rolled up form",
      type: 'number',
    },
    baseline: {
      title: 'Baseline',
      discriminator: {
        propertyName: 'type',
        mapping: {
          TrailingWindow: '#/definitions/TrailingWindowBaseline',
          Reference: '#/definitions/ReferenceProfileId',
          TimeRange: '#/definitions/TimeRangeBaseline',
          CurrentBatch: '#/definitions/SingleBatchBaseline',
        },
      },
      oneOf: [
        {
          $ref: '#/definitions/TrailingWindowBaseline',
        },
        {
          $ref: '#/definitions/ReferenceProfileId',
        },
        {
          $ref: '#/definitions/TimeRangeBaseline',
        },
        {
          $ref: '#/definitions/SingleBatchBaseline',
        },
      ],
    },
  },
  required: ['metric', 'type', 'mode', 'threshold', 'baseline'],
  additionalProperties: false,
};

export const jsonCodeMock = {
  monitors: [
    {
      id: 'mock-monitor-id',
      schedule: {
        type: 'immediate',
      },
      mode: {
        type: 'DIGEST',
        datasetTimestampOffset: 'P7D',
      },
      displayName: 'Missing value ratio vs time range-62902',
      severity: 3,
      analyzerIds: ['mock-analyzer-id'],
      actions: [
        {
          type: 'global',
          target: 'email',
        },
      ],
      metadata: {
        invalid: 'black-listed-field',
      },
      tags: ['black-listed-field'],
    },
  ],
  analyzers: [
    {
      id: 'mock-analyzer-id',
      schedule: {
        type: 'fixed',
        cadence: 'daily',
      },
      targetMatrix: {
        type: 'column',
        include: ['group:input'],
        exclude: [],
        segments: [],
      },
      config: {
        metric: 'count_null_ratio',
        type: 'stddev',
        factor: 3,
        baseline: {
          type: 'TimeRange',
          range: {
            start: '2023-01-05T00:00:00.000Z',
            end: '2023-02-04T23:59:59.999Z',
          },
        },
      },
      metadata: {
        invalid: 'black-listed-field',
      },
      tags: ['black-listed-field'],
    },
  ],
};

export const hourlyModelMock: ResourceStateMock = {
  id: 'model-test',
  batchFrequency: TimePeriod.Pt1H,
  name: 'hourly-test-model',
  category: AssetCategory.Model,
  type: ModelType.Classification,
};

export const dailyModelMock: ResourceStateMock = {
  id: 'model-test',
  batchFrequency: TimePeriod.P1D,
  name: 'daily-test-model',
  category: AssetCategory.Model,
  type: ModelType.Classification,
};

export const weeklyModelMock: ResourceStateMock = {
  id: 'model-test',
  batchFrequency: TimePeriod.P1W,
  name: 'weekly-test-model',
  category: AssetCategory.Model,
  type: ModelType.Classification,
};

export const monthlyModelMock: ResourceStateMock = {
  id: 'model-test',
  batchFrequency: TimePeriod.P1M,
  name: 'monthly-test-model',
  category: AssetCategory.Model,
  type: ModelType.Classification,
};

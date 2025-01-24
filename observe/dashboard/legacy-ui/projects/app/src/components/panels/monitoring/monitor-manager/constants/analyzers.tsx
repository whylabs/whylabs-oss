import { Analyzer } from 'generated/monitor-schema';
import {
  MV2_DATA_TYPE,
  MV2_DATA_TYPE_30,
  MV2_MISSING_VALUE,
  MV2_MISSING_VALUE_30,
  MV2_UNIQUE_VALUE,
  MV2_UNIQUE_VALUE_30,
} from './fixedAnalyzerIds';

type MV2AnalyzerKeys = 'MISSING_VALUE' | 'UNIQUE_VALUE' | 'DATA_TYPE';
type MV2Presets = { [key in MV2AnalyzerKeys]: Analyzer };

export const MV2_ANALYZERS: MV2Presets = {
  MISSING_VALUE: {
    config: {
      baseline: {
        size: 7,
        type: 'TrailingWindow',
      },
      factor: 3,
      metric: 'count_null_ratio',
      type: 'stddev',
    },
    id: MV2_MISSING_VALUE,
    schedule: {
      cadence: 'daily',
      type: 'fixed',
    },
    targetMatrix: {
      include: ['*'],
      segments: [],
      type: 'column',
    },
  },
  UNIQUE_VALUE: {
    config: {
      baseline: {
        size: 7,
        type: 'TrailingWindow',
      },
      factor: 3,
      metric: 'unique_est',
      type: 'stddev',
    },
    id: MV2_UNIQUE_VALUE,
    schedule: {
      cadence: 'daily',
      type: 'fixed',
    },
    targetMatrix: {
      include: ['*'],
      segments: [],
      type: 'column',
    },
  },
  DATA_TYPE: {
    config: {
      baseline: {
        size: 7,
        type: 'TrailingWindow',
      },
      metric: 'inferred_data_type',
      operator: 'eq',
      type: 'comparison',
    },
    id: MV2_DATA_TYPE,
    schedule: {
      cadence: 'daily',
      type: 'fixed',
    },
    targetMatrix: {
      include: ['*'],
      segments: [],
      type: 'column',
    },
  },
};

export const MV2_ANALYZERS_30_TRAILING_WINDOW: MV2Presets = {
  MISSING_VALUE: {
    config: {
      baseline: {
        size: 30,
        type: 'TrailingWindow',
      },
      factor: 3,
      metric: 'count_null_ratio',
      type: 'stddev',
    },
    id: MV2_MISSING_VALUE_30,
    schedule: {
      cadence: 'daily',
      type: 'fixed',
    },
    targetMatrix: {
      include: ['*'],
      segments: [],
      type: 'column',
    },
  },
  UNIQUE_VALUE: {
    config: {
      baseline: {
        size: 30,
        type: 'TrailingWindow',
      },
      factor: 3,
      metric: 'unique_est',
      type: 'stddev',
    },
    id: MV2_UNIQUE_VALUE_30,
    schedule: {
      cadence: 'daily',
      type: 'fixed',
    },
    targetMatrix: {
      include: ['*'],
      segments: [],
      type: 'column',
    },
  },
  DATA_TYPE: {
    config: {
      baseline: {
        size: 30,
        type: 'TrailingWindow',
      },
      metric: 'inferred_data_type',
      operator: 'eq',
      type: 'comparison',
    },
    id: MV2_DATA_TYPE_30,
    schedule: {
      cadence: 'daily',
      type: 'fixed',
    },
    targetMatrix: {
      include: ['*'],
      segments: [],
      type: 'column',
    },
  },
};

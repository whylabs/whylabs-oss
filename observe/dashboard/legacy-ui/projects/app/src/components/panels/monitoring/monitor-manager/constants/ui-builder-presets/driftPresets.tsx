import { Colors } from '@whylabs/observatory-lib';
import { AssetCategory, TimePeriod } from 'generated/graphql';
import discreteIcon from 'ui/discrete-icon.svg';
import nonDiscreteIcon from 'ui/non-discrete-icon.svg';
import { ID_FREQUENT_ITEMS_DRIFT_ANALYZER, ID_NUMERICAL_DRIFT_ANALYZER } from '../fixedAnalyzerIds';
import { DEFAULT, defaultTrailingWindowBaselineSize, MonitorItem } from '../presetUtils';

export const DRIFT_PRESETS: MonitorItem[] = [
  {
    color: Colors.orange,
    title: (category: AssetCategory): string => {
      if (category === AssetCategory.Data) {
        return 'Data drift in dataset columns';
      }
      return 'Data drift in model inputs';
    },
    categoryTitle: (category: AssetCategory): string => {
      if (category === AssetCategory.Data) {
        return 'All discrete columns';
      }
      return 'All discrete inputs';
    },
    description: (_: AssetCategory, batchFrequency?: TimePeriod): JSX.Element => {
      const baseline = batchFrequency && defaultTrailingWindowBaselineSize.get(batchFrequency);
      return (
        <span>
          Compared to a trailing <strong>{baseline?.description || 'window'}</strong> baseline
        </span>
      );
    },
    icon: discreteIcon,
    analyzer: {
      config: {
        algorithm: 'hellinger',
        baseline: {
          size: DEFAULT.BASELINE.SIZE,
          type: DEFAULT.BASELINE.TYPE,
        },
        metric: 'frequent_items',
        threshold: 0.7,
        type: 'drift',
      },
      id: ID_FREQUENT_ITEMS_DRIFT_ANALYZER,
      schedule: {
        cadence: 'daily',
        type: 'fixed',
      },
      targetMatrix: {
        include: ['group:discrete'],
        exclude: ['group:output'],
        segments: [{ tags: [] }],
        type: 'column',
      },
    },
  },
  {
    color: Colors.orange,
    title: (category: AssetCategory): string => {
      if (category === AssetCategory.Data) {
        return 'Data drift in dataset columns';
      }
      return 'Data drift in model inputs';
    },
    categoryTitle: (category: AssetCategory): string => {
      if (category === AssetCategory.Data) {
        return 'All non-discrete columns';
      }
      return 'All non-discrete inputs';
    },
    description: (_: AssetCategory, batchFrequency?: TimePeriod): JSX.Element => {
      const baseline = batchFrequency && defaultTrailingWindowBaselineSize.get(batchFrequency);
      return (
        <span>
          Compared to a trailing <strong>{baseline?.description || 'window'}</strong> baseline
        </span>
      );
    },
    icon: nonDiscreteIcon,
    analyzer: {
      config: {
        algorithm: 'hellinger',
        baseline: {
          size: DEFAULT.BASELINE.SIZE,
          type: DEFAULT.BASELINE.TYPE,
        },
        metric: 'histogram',
        threshold: 0.7,
        type: 'drift',
      },
      id: ID_NUMERICAL_DRIFT_ANALYZER,
      schedule: {
        cadence: 'daily',
        type: 'fixed',
      },
      targetMatrix: {
        include: ['group:continuous'],
        exclude: ['group:output'],
        segments: [{ tags: [] }],
        type: 'column',
      },
    },
  },
];

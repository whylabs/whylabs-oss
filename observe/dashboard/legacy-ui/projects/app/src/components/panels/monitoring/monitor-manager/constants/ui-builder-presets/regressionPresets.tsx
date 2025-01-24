import { Colors } from '@whylabs/observatory-lib';
import f1score from 'ui/f1score.svg';
import precision from 'ui/precision.svg';
import recall from 'ui/recall.svg';
import { ID_MAE_ANALYZER, ID_MSE_ANALYZER, ID_RMSE_ANALYZER } from '../fixedAnalyzerIds';
import { MonitorItem, DEFAULT } from '../presetUtils';

export const REGRESSION_PRESETS: MonitorItem[] = [
  {
    color: Colors.purple,
    title: () => 'MSE',
    categoryTitle: () => 'Performance drop',
    description: () => <>Detects when model mean squared error deteriorates</>,
    icon: f1score,
    analyzer: {
      config: {
        baseline: {
          size: DEFAULT.BASELINE.SIZE,
          type: DEFAULT.BASELINE.TYPE,
        },
        metric: 'regression.mse',
        mode: 'pct',
        threshold: DEFAULT.THRESHOLD,
        type: 'diff',
      },
      id: ID_MSE_ANALYZER,
      schedule: {
        cadence: 'daily',
        type: 'fixed',
      },
      targetMatrix: {
        type: 'dataset',
      },
    },
  },
  {
    color: Colors.purple,
    title: () => 'MAE',
    categoryTitle: () => 'Performance drop',
    description: () => <>Detects when model mean absolute error deteriorates</>,
    icon: precision,
    analyzer: {
      config: {
        baseline: {
          size: DEFAULT.BASELINE.SIZE,
          type: DEFAULT.BASELINE.TYPE,
        },
        metric: 'regression.mae',
        mode: 'pct',
        threshold: DEFAULT.THRESHOLD,
        type: 'diff',
      },
      id: ID_MAE_ANALYZER,
      schedule: {
        cadence: 'daily',
        type: 'fixed',
      },
      targetMatrix: {
        type: 'dataset',
      },
    },
  },
  {
    color: Colors.purple,
    title: () => 'RMSE',
    categoryTitle: () => 'Performance drop',
    description: () => <>Detects when model root mean squared error deteriorates</>,
    icon: recall,
    analyzer: {
      config: {
        baseline: {
          size: DEFAULT.BASELINE.SIZE,
          type: DEFAULT.BASELINE.TYPE,
        },
        metric: 'regression.rmse',
        mode: 'pct',
        threshold: DEFAULT.THRESHOLD,
        type: 'diff',
      },
      id: ID_RMSE_ANALYZER,
      schedule: {
        cadence: 'daily',
        type: 'fixed',
      },
      targetMatrix: {
        type: 'dataset',
      },
    },
  },
];

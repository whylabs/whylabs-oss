import { Colors } from '@whylabs/observatory-lib';
import f1score from 'ui/f1score.svg';
import precision from 'ui/precision.svg';
import recall from 'ui/recall.svg';
import accuracy from 'ui/accuracy-icon.svg';
import {
  ID_ACCURACY_ANALYZER,
  ID_F1_ANALYZER,
  ID_FPR_ANALYZER,
  ID_PRECISION_ANALYZER,
  ID_RECALL_ANALYZER,
} from '../fixedAnalyzerIds';
import { DEFAULT, MonitorItem } from '../presetUtils';

export const CLASSIFICATION_PRESETS: MonitorItem[] = [
  {
    color: Colors.purple,
    title: () => 'F1 Score',
    categoryTitle: () => 'Performance drop',
    description: () => <>Detects when model F1 deteriorates</>,
    icon: f1score,
    analyzer: {
      config: {
        baseline: {
          size: DEFAULT.BASELINE.SIZE,
          type: DEFAULT.BASELINE.TYPE,
        },
        metric: 'classification.f1',
        mode: 'pct',
        threshold: DEFAULT.THRESHOLD,
        type: 'diff',
      },
      id: ID_F1_ANALYZER,
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
    title: () => 'Precision',
    categoryTitle: () => 'Performance drop',
    description: () => <>Detects when model precision deteriorates</>,
    icon: precision,
    analyzer: {
      config: {
        baseline: {
          size: DEFAULT.BASELINE.SIZE,
          type: DEFAULT.BASELINE.TYPE,
        },
        metric: 'classification.precision',
        mode: 'pct',
        threshold: DEFAULT.THRESHOLD,
        type: 'diff',
      },
      id: ID_PRECISION_ANALYZER,
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
    title: () => 'Recall',
    categoryTitle: () => 'Performance drop',
    description: () => <>Detects when model recall deteriorates</>,
    icon: recall,
    analyzer: {
      config: {
        baseline: {
          size: DEFAULT.BASELINE.SIZE,
          type: DEFAULT.BASELINE.TYPE,
        },
        metric: 'classification.recall',
        mode: 'pct',
        threshold: DEFAULT.THRESHOLD,
        type: 'diff',
      },
      id: ID_RECALL_ANALYZER,
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
    title: () => 'Accuracy',
    categoryTitle: () => 'Performance drop',
    description: () => <>Detects when model accuracy deteriorates</>,
    icon: accuracy,
    analyzer: {
      config: {
        baseline: {
          size: DEFAULT.BASELINE.SIZE,
          type: DEFAULT.BASELINE.TYPE,
        },
        metric: 'classification.accuracy',
        mode: 'pct',
        threshold: DEFAULT.THRESHOLD,
        type: 'diff',
      },
      id: ID_ACCURACY_ANALYZER,
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
    title: () => 'FPR',
    categoryTitle: () => 'Performance drop',
    description: () => <>Detects when model false positive rate deteriorates</>,
    icon: accuracy,
    analyzer: {
      config: {
        baseline: {
          size: DEFAULT.BASELINE.SIZE,
          type: DEFAULT.BASELINE.TYPE,
        },
        metric: 'classification.fpr',
        mode: 'pct',
        threshold: DEFAULT.THRESHOLD,
        type: 'diff',
      },
      id: ID_FPR_ANALYZER,
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

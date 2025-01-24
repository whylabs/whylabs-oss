import { DEBUG_MODE } from '../CustomMonitorManager';
import { thresholdAlgorithmMap } from '../CustomMonitorTypes';

it('Grant debug mode disabled to land', () => {
  expect(DEBUG_MODE).toEqual(false);
});

it('Grant thresholdAlgorithmMap values', () => {
  expect([...thresholdAlgorithmMap.entries()]).toStrictEqual([
    ['hellinger', { tooltip: 'Number from 0 to 1', min: 0, max: 1, defaultValue: 0.7 }],
    ['jensenshannon', { tooltip: 'Number from 0 to 1', min: 0, max: 1, defaultValue: 0.1 }],
    ['kl_divergence', { tooltip: 'Positive number', min: 0, defaultValue: 0.1 }],
    ['psi', { tooltip: 'Number from 0 to 1', min: 0, max: 1, defaultValue: 0.2 }],
  ]);
});

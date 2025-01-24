import { translateDatedCurvesTooltipData } from '../utils';

describe('testing translateDatedCurvesTooltipData', () => {
  it.each([1651806000000, 1646535600000, 1644116400000])('testing without data in %p timestamp', (timestamp) => {
    const result = translateDatedCurvesTooltipData(timestamp, undefined);
    expect(result).toStrictEqual({
      items: [],
      timestamp,
    });
  });

  it.each([
    { timestamp: 1651806000000, color: '#123123', label: 'test', value: 2 },
    { timestamp: 1646535600000, color: '#333333', label: 'tooltip', value: 3 },
    { timestamp: 1644116400000, color: '#666666', label: 'whylabs', value: 5 },
    { timestamp: 1643770800000, color: '#111111', label: 'null-value', value: null },
  ])('Should translate correct data in %p timestamp', (data) => {
    const result = translateDatedCurvesTooltipData(data.timestamp, data);
    expect(result).toStrictEqual({
      items: [
        {
          color: data.color,
          count: data.value ?? 0,
          label: data.label,
        },
      ],
      timestamp: data.timestamp,
    });
  });
});

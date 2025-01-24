import {
  convertNumericQuantileToKeyedQuantile,
  createFlexibleDatedQuantiles,
  DatedQuantileSummary,
} from 'utils/createDatedQuantiles';

describe('createFlexibleDatedQuantiles functionality tests', () => {
  it('correctly filters mismatches between bins array and counts array', () => {
    const output = createFlexibleDatedQuantiles({
      sketches: [
        {
          datasetTimestamp: 0,
          showAsDiscrete: false,
          numberSummary: {
            quantiles: {
              bins: [0.1, 0.2, 0.3],
              counts: [1, 2, 3],
            },
          },
        },
        {
          datasetTimestamp: 1,
          showAsDiscrete: false,
          numberSummary: {
            quantiles: {
              bins: [0.1, 0.2, 0.3],
              counts: [1, 3],
            },
          },
        },
        {
          datasetTimestamp: 2,
          showAsDiscrete: false,
          numberSummary: {
            quantiles: {
              bins: [0.1, 0.2],
              counts: [1, 2],
            },
          },
        },
      ],
    });
    expect(output.length).toEqual(2);
    expect(output[0].dateInMillis).toEqual(0);
    expect(output[1].dateInMillis).toEqual(2);
  });
});

describe('convertNumericQuantileToKeyedQuantile legacy function tests', () => {
  it('converts values as expected', () => {
    const dq1: DatedQuantileSummary = {
      dateInMillis: 1,
      showAsDiscrete: false,
      quantiles: {
        bins: [0.1, 0.5],
        counts: [30, 40],
      },
    };
    const dq2: DatedQuantileSummary = {
      dateInMillis: 2,
      showAsDiscrete: true,
      quantiles: {
        bins: [0.2, 0.333],
        counts: [34, 999],
      },
    };
    const dkq1 = convertNumericQuantileToKeyedQuantile(dq1);
    const dkq2 = convertNumericQuantileToKeyedQuantile(dq2);
    expect(dkq1).toEqual({
      dateInMillis: 1,
      quantiles: {
        bins: ['10%', '50%'],
        counts: [30, 40],
      },
    });
    expect(dkq2).toEqual({
      dateInMillis: 2,
      quantiles: {
        bins: ['20%', '33%'],
        counts: [34, 999],
      },
    });
  });
});

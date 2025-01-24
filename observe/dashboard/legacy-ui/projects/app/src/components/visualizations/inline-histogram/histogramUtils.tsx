import { HistogramFieldsFragment } from 'generated/graphql';

export interface HistogramDomain {
  min: number;
  max: number;
  isValid: boolean;
}

export function generateCommonXAxis(histograms: HistogramFieldsFragment[]): HistogramDomain {
  const unifiedDomain: HistogramDomain = {
    min: Number.MAX_VALUE,
    max: Number.MIN_VALUE,
    isValid: false,
  };

  // Lint ignore note: it would be rediculous to descruture this variable length array for the min and max
  /* eslint-disable prefer-destructuring */
  histograms.forEach((hist) => {
    if (hist.bins.length > 0) {
      if (hist.bins[0] < unifiedDomain.min) {
        unifiedDomain.min = hist.bins[0];
      }
      if (hist.bins[hist.bins.length - 1] > unifiedDomain.max) {
        unifiedDomain.max = hist.bins[hist.bins.length - 1];
      }
    }
  });

  if (unifiedDomain.max > unifiedDomain.min) {
    unifiedDomain.isValid = true;
  }
  return unifiedDomain;
}

export function generateCommonYAxis(histograms: HistogramFieldsFragment[]): HistogramDomain {
  const unifiedDomain: HistogramDomain = {
    min: 0,
    max: Number.MIN_VALUE,
    isValid: false,
  };

  histograms.forEach((hist) => {
    hist.counts.forEach((count) => {
      if (count > unifiedDomain.max) {
        unifiedDomain.max = count;
      }
    });
  });

  if (unifiedDomain.max > unifiedDomain.min) {
    unifiedDomain.isValid = true;
  }
  return unifiedDomain;
}

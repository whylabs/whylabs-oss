import { Maybe, NumberSummaryFieldsFragment, QuantileSummaryFieldsFragment } from 'generated/graphql';

export interface DatedQuantileSummary {
  dateInMillis: number;
  lastUploadTimestamp?: number;
  showAsDiscrete: boolean;
  quantiles: {
    bins: number[];
    counts: number[];
  };
}

type sketchesTypeSingleValues = {
  __typename?: 'FeatureSketch' | undefined;
  datasetTimestamp?: Maybe<number> | undefined;
  lastUploadTimestamp?: Maybe<number> | undefined;
  showAsDiscrete: boolean;
  numberSummary?: NumberSummaryFieldsFragment | null;
};

export interface DatedKeyedQuantileSummary {
  dateInMillis: number;
  lastUploadTimestamp?: number;
  quantiles: {
    bins: string[];
    counts: number[];
  };
}

export function convertNumericQuantileToKeyedQuantile(nQuantile: DatedQuantileSummary): DatedKeyedQuantileSummary {
  return {
    dateInMillis: nQuantile.dateInMillis,
    lastUploadTimestamp: nQuantile.lastUploadTimestamp,
    quantiles: {
      bins: nQuantile.quantiles.bins.map((bin) => `${(bin * 100).toFixed(0)}%`),
      counts: nQuantile.quantiles.counts,
    },
  };
}

export function hasValidQuantileDataOrNone(sketch: QuantileSummaryFieldsFragment | sketchesTypeSingleValues): boolean {
  const bins = sketch.numberSummary?.quantiles.bins ?? [];
  const counts = sketch.numberSummary?.quantiles.counts ?? [];
  return bins.length === counts.length;
}

export function createFlexibleDatedQuantiles(
  data:
    | {
        sketches: Array<QuantileSummaryFieldsFragment | sketchesTypeSingleValues>;
      }
    | null
    | undefined,
): DatedQuantileSummary[] {
  if (!data) {
    return [];
  }
  return data.sketches
    .filter(hasValidQuantileDataOrNone)
    .map((sketch) => ({
      dateInMillis: sketch.datasetTimestamp ?? 0,
      lastUploadTimestamp: sketch.lastUploadTimestamp ?? 0,
      showAsDiscrete: sketch.showAsDiscrete,
      quantiles: {
        bins: sketch.numberSummary?.quantiles.bins ?? [],
        counts: sketch.numberSummary?.quantiles.counts ?? [],
      },
    }))
    .sort((a, b) => a.dateInMillis - b.dateInMillis);
}

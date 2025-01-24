import { GetUniqueSummariesForFeatureQuery, UniqueCountSummary } from 'generated/graphql';
import { DatedData } from 'types/graphTypes';
import { areAllDefinedAndNonNull } from './nullUtils';

export interface DatedUniqueSummary extends DatedData {
  estimate: number;
  upper: number;
  lower: number;
  ratio: number;
  lastUploadTimestamp?: number;
}

export function isValidUniqueCountSummary(
  summary: Pick<UniqueCountSummary, 'upper' | 'lower' | 'estimate'> | null | undefined,
): boolean {
  if (!summary) {
    return false;
  }
  return areAllDefinedAndNonNull(summary.estimate, summary.lower, summary.upper);
}

export function createDatedUniqueSummaries(data: GetUniqueSummariesForFeatureQuery | undefined): DatedUniqueSummary[] {
  if (!data?.model?.feature?.sketches) {
    return [];
  }
  return data.model.feature.sketches
    .reduce((filteredSketches, sketch) => {
      if (sketch.uniqueCount && isValidUniqueCountSummary(sketch.uniqueCount)) {
        filteredSketches.push({
          dateInMillis: sketch.datasetTimestamp ?? 0,
          lastUploadTimestamp: sketch.lastUploadTimestamp ?? undefined,
          estimate: sketch.uniqueCount.estimate as number,
          upper: sketch.uniqueCount.upper as number,
          lower: sketch.uniqueCount.lower as number,
          ratio: sketch.uniqueRatio as number,
        });
      }
      return filteredSketches;
    }, [] as DatedUniqueSummary[])
    .sort((a, b) => a.dateInMillis - b.dateInMillis);
}

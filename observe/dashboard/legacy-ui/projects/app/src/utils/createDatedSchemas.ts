import {
  FeatureType,
  GetSchemasForFeatureQuery,
  SchemaFieldsFragment,
  TypeInference,
  TypeSummary,
} from 'generated/graphql';
import { areAllDefinedAndNonNull } from './nullUtils';

export interface DatedSchema {
  dateInMillis: number;
  lastUploadTimestamp?: number;
  typeCounts: { type: FeatureType; count: number }[];
  inference: { type: FeatureType; ratio: number };
}

export interface SchemaTypeBridge {
  inference?: Pick<TypeInference, 'type' | 'ratio' | 'count'> | null | undefined;
  typeCounts: Pick<TypeSummary, 'type' | 'count'>[];
}

export function isValidSchema(summary: SchemaTypeBridge | undefined | null): boolean {
  if (!summary) {
    return false;
  }
  return areAllDefinedAndNonNull(summary.inference, summary.inference?.ratio, summary.inference?.type);
}

export function isValidTypeCount(typeCount: Pick<TypeSummary, 'type' | 'count'>): boolean {
  return areAllDefinedAndNonNull(typeCount.count, typeCount.type);
}

export function filterInvalidAndMapToExpected(
  typeCounts: Pick<TypeSummary, 'type' | 'count'>[],
): { type: FeatureType; count: number }[] {
  return typeCounts.filter(isValidTypeCount).map((tc) => ({ type: tc.type as FeatureType, count: tc.count as number }));
}

function getTotals(data: DatedSchema[]): Map<string, number> {
  const totalTypeCounts = new Map<string, number>();
  Object.keys(FeatureType).forEach((t) => {
    totalTypeCounts.set(t.toLowerCase(), 0);
  });

  data.forEach((datum) => {
    datum.typeCounts.forEach((tc) => {
      const typeString = tc.type.toString().toLowerCase();
      totalTypeCounts.set(typeString, (totalTypeCounts.get(typeString) || 0) + tc.count);
    });
  });
  return totalTypeCounts;
}

function removeZeros(data: DatedSchema[], totalCounts: Map<string, number>): DatedSchema[] {
  const zeroTypes = new Set<string>(Array.from(totalCounts.keys()).filter((key) => totalCounts.get(key) === 0));
  if (zeroTypes.size === 0) {
    return data;
  }

  return data.map((datum) => ({
    ...datum,
    typeCounts: datum.typeCounts.filter((tc) => !zeroTypes.has(tc.type.toString().toLowerCase())),
  }));
}

export function createFlexibleDatedSchemas(
  data: { sketches: Array<SchemaFieldsFragment> } | null | undefined,
): DatedSchema[] {
  if (!data) {
    return [];
  }

  const rawCounts = data.sketches.reduce((filteredSketches, sketch) => {
    if (sketch?.schemaSummary?.inference && isValidSchema(sketch.schemaSummary)) {
      const forcedInference = {
        type: sketch.schemaSummary.inference.type,
        ratio: sketch.schemaSummary.inference.ratio,
      };
      filteredSketches.push({
        dateInMillis: sketch.datasetTimestamp ?? 0,
        lastUploadTimestamp: sketch.lastUploadTimestamp ?? undefined,
        inference: forcedInference,
        typeCounts: filterInvalidAndMapToExpected(sketch.schemaSummary.typeCounts),
      });
    }
    return filteredSketches;
  }, [] as DatedSchema[]);
  return removeZeros(rawCounts, getTotals(rawCounts)).sort((a, b) => a.dateInMillis - b.dateInMillis);
}

export function createDatedSchemas(data: GetSchemasForFeatureQuery | null | undefined): DatedSchema[] {
  if (!data?.model?.feature) {
    return [];
  }

  const rawCounts = data.model.feature.sketches.reduce((filteredSketches, sketch) => {
    if (sketch?.schemaSummary?.inference && isValidSchema(sketch.schemaSummary)) {
      const forcedInference = {
        type: sketch.schemaSummary.inference.type,
        ratio: sketch.schemaSummary.inference.ratio,
      };
      filteredSketches.push({
        dateInMillis: sketch.datasetTimestamp ?? 0,
        lastUploadTimestamp: sketch.lastUploadTimestamp ?? undefined,
        inference: forcedInference,
        typeCounts: filterInvalidAndMapToExpected(sketch.schemaSummary.typeCounts),
      });
    }
    return filteredSketches;
  }, [] as DatedSchema[]);
  return removeZeros(rawCounts, getTotals(rawCounts)).sort((a, b) => a.dateInMillis - b.dateInMillis);
}

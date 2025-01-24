import { SegmentTag } from '@whylabs/data-service-node-client';
import { cloneDeep, difference, sortBy } from 'lodash';

import { MetricRollupResult } from '../../graphql/generated/graphql';
import { allAnalyzerTypeFields, analyzerTypeFields } from './analysis-results';
import { floatFieldsNumberSummary } from './checks';

export type Sketch = {
  id?: string;
  createdAt?: number;
  featureName?: string;
  numberSummary?: {
    histogram?: { counts: number[] };
    quantiles?: { counts?: number[]; bins?: number[] };
    stddev?: number;
    min?: number;
    max?: number;
    mean?: number;
  };
};
type Batch = { sketches: { results: Sketch[] } };
export type BatchesWithId = {
  data?: { model?: { batches: Batch[]; referenceProfiles: Batch[] } };
};

// This file contains helper functions to filter graphql results to remove id fields and others that may change
// from run to run.

const deleteIdsFromSketch =
  (isRef = false) =>
  (sketch: Sketch) => {
    if (isRef) {
      // reference profiles are constantly recreated in druid so createdAt is not stable
      delete sketch.createdAt;
    }
    delete sketch.id;
    // and histogram is not generated stably
    delete sketch.numberSummary?.histogram;
    delete sketch.numberSummary?.quantiles?.counts;
    // and the float fields needs to be checked approximately
    deleteFields(sketch.numberSummary, floatFieldsNumberSummary);
  };
const deleteIdsFromFeatureSketch = deleteIdsFromSketch(false);

const deleteIdsFromBatchOrRef =
  (isRef = false) =>
  (batch: Batch) => {
    batch.sketches.results.forEach((r: Sketch) => {
      deleteIdsFromSketch(isRef)(r);
    });
  };

const deleteIdsFromBatch = deleteIdsFromBatchOrRef(false);
const deleteIdsFromRefBatch = deleteIdsFromBatchOrRef(true);

/**
 * Filters out changeable fields from batches results
 * @param data
 */
export const filterBatches = (data: BatchesWithId, sortOnly = false): BatchesWithId => {
  // apparently sketch feature ids are random guids
  const copy = cloneDeep(data) ?? {};
  copy.data?.model?.batches.forEach((batch) => {
    if (!sortOnly) deleteIdsFromBatch(batch);
    batch.sketches.results = sortBy(batch.sketches.results, ['featureName']);
  });
  copy.data?.model?.referenceProfiles.forEach((batch) => {
    if (!sortOnly) deleteIdsFromRefBatch(batch);
    batch.sketches.results = sortBy(batch.sketches.results, ['featureName']);
  });
  return copy;
};

type CategoryCount = {
  category: string;
  count: string;
  metric?: string;
};

type CountsByCategory = { timeseries: { counts: CategoryCount[] }[]; totals: CategoryCount[] };

// Helper code used in filtersort functions
type PartialFeatureWithIds = {
  id?: string;
  baselineSketch?: Sketch | null | undefined;
  sketches?: Sketch[] | null | undefined;
  analysisResults?: PartialAnalysisResult[];
  alertCountsV2?: CountsByCategory;
  anomalyCounts?: CountsByCategory;
};

// Make sure data you pass in is a deep copy
const deleteIdsFromPartialFeature = (data: PartialFeatureWithIds | null | undefined) => {
  if (!data) return;
  delete data.id;
  if (data.baselineSketch) {
    delete data.baselineSketch.id;
  }
  if (data.sketches) {
    data.sketches.forEach(deleteIdsFromFeatureSketch);
  }
};

type PartialAnalysisResult = {
  id?: string;
  runId?: string;
  creationTimestamp?: number;
  datasetTimestamp?: number;
  analyzerId?: number;
  analyzerType: string;
  calculationRuntimeNano?: number;
  weight?: number;
  tags?: SegmentTag[];
  tagString?: string; // added in test to help with sorting
};

const deleteFields = (data: { [index: string]: unknown } | null | undefined, fields: string[]) => {
  if (!data) return;
  fields.forEach((s) => delete data[s]);
};

const deleteFieldsFromPartialAnalysisResults = (data: PartialAnalysisResult) => {
  deleteFields(data, [
    'id',
    'runId',
    'creationTimestamp',
    'calculationRuntimeNano',
    'mostRecentDatasetDatalakeWriteTs',
    'drift_minBatchSize',
    'analyzerConfigVersion', // set to 0 in spark monitor
  ]);
};

export const filterFilteredFeature = (data: {
  data?: { model?: { output: PartialFeatureWithIds; filteredFeatures?: { results: PartialFeatureWithIds[] } } };
}): object => {
  const copy = cloneDeep(data) ?? {};
  copy.data?.model?.filteredFeatures?.results.forEach(deleteIdsFromPartialFeature);
  deleteIdsFromPartialFeature(copy.data?.model?.output);
  return copy;
};

const sortCategoryCounts = (data: { counts: CategoryCount[] }[]) => {
  if (data) {
    for (const items of data) {
      items.counts = sortBy(items.counts, ['category', 'metric']);
    }
  }
};

const sortCategoryTotals = (data?: { totals: CategoryCount[] }) => {
  if (data) {
    data.totals = sortBy(data.totals, ['category', 'metric']);
  }
};

const sortCountsByCategory = (data: CountsByCategory | undefined) => {
  if (data) {
    sortCategoryTotals(data);
    sortCategoryCounts(data.timeseries);
  }
};

export const filterSegmentedFilteredFeature = (data: {
  data?: {
    model?: {
      segment?: { id?: string; output: PartialFeatureWithIds; filteredFeatures?: { results: PartialFeatureWithIds[] } };
    };
  };
}): object => {
  const copy = cloneDeep(data) ?? {};
  const segment = copy.data?.model?.segment;
  if (segment) {
    delete segment.id;
  }
  segment?.filteredFeatures?.results.forEach(deleteIdsFromPartialFeature);
  segment?.filteredFeatures?.results.forEach((r) => {
    if (r.alertCountsV2) sortCountsByCategory(r.alertCountsV2);
    if (r.anomalyCounts) sortCountsByCategory(r.anomalyCounts);
  });
  deleteIdsFromPartialFeature(segment?.output);
  return copy;
};

export const filterSegments = (data: {
  data?: {
    model?: {
      segments?: {
        id?: string;
        mv3TotalAlerts: CountsByCategory;
      }[];
    };
  };
}): object => {
  const copy = cloneDeep(data) ?? {};
  copy.data?.model?.segments?.forEach((s) => {
    delete s.id;
    sortCountsByCategory(s.mv3TotalAlerts);
  });
  return copy;
};

export const filterOverview = (
  excludeLatestAnomaly: string[], // eg model has a late upload monitor
  data: {
    data?: { models?: { id: string; anomalyCounts: CountsByCategory; latestAnomalyTimestamp?: number }[] };
  },
): object => {
  const copy = cloneDeep(data) ?? {};
  if (copy.data?.models) {
    copy.data.models = sortBy(copy.data.models, ['id']);
    copy.data?.models?.forEach((m) => {
      sortCountsByCategory(m.anomalyCounts);
      if (excludeLatestAnomaly.includes(m.id)) {
        delete m.latestAnomalyTimestamp;
      }
    });
  }
  return copy;
};

export const filterFeature = (data: { data?: { model?: { feature: PartialFeatureWithIds } } }): object => {
  const copy = cloneDeep(data) ?? {};
  deleteIdsFromPartialFeature(copy.data?.model?.feature);
  copy.data?.model?.feature?.analysisResults?.forEach(filterAnalyzerResult);
  if (copy.data?.model?.feature?.analysisResults) {
    copy.data.model.feature.analysisResults = sortAnalyzerResults(copy.data.model.feature.analysisResults);
  }
  return copy;
};

export const filterSegmentFeature = (data: {
  data?: { model?: { segment?: { id?: string; feature: PartialFeatureWithIds } } };
}): object => {
  const copy = cloneDeep(data) ?? {};
  const segment = copy.data?.model?.segment;
  if (segment) {
    delete segment.id;
  }
  deleteIdsFromPartialFeature(segment?.feature);
  segment?.feature?.analysisResults?.forEach(filterAnalyzerResult);
  if (segment?.feature?.analysisResults) {
    segment.feature.analysisResults = sortAnalyzerResults(segment.feature.analysisResults);
  }

  return copy;
};

export const filterFeatures = (data: {
  data?: { model?: { features: PartialFeatureWithIds[]; outputs: PartialFeatureWithIds[] } };
}): object => {
  const copy = cloneDeep(data) ?? {};
  copy.data?.model?.features?.forEach(deleteIdsFromPartialFeature);
  copy.data?.model?.outputs?.forEach(deleteIdsFromPartialFeature);
  return copy;
};

const deleteFieldsByAnalyzerType = (data: { [index: string]: unknown }, analyzerType: string): void => {
  const excludeFields: string[] = difference(allAnalyzerTypeFields, analyzerTypeFields[analyzerType]);
  excludeFields.forEach((f) => delete data[f]);
  // upper/lower bounds can be optional so we can't properly check 0/null thresholds
  if (!data.threshold_absoluteLower) delete data['threshold_absoluteLower'];
  if (!data.threshold_absoluteUpper) delete data['threshold_absoluteUpper'];
};

const roundFieldsByAnalyzerType = (data: { [index: string]: unknown }, analyzerType: string): void => {
  const relevant: string[] | undefined = analyzerTypeFields[analyzerType];
  relevant?.forEach((f) => {
    const val = data[f];
    // force floating point numbers to a fixed precision to avoid float rounding issues
    if (typeof val === 'number' && Number.isFinite(val) && !Number.isInteger(val)) {
      data[f] = Number(val.toPrecision(10));
    }
  });
};

// Note modifies object
const filterAnalyzerResult = (result: PartialAnalysisResult): object => {
  deleteFieldsFromPartialAnalysisResults(result);
  deleteFieldsByAnalyzerType(result, result.analyzerType);
  roundFieldsByAnalyzerType(result, result.analyzerType);
  // null is 0 in druid
  if (result.weight === null) result.weight = 0;
  return result;
};

const sortAnalyzerResults = (results: PartialAnalysisResult[]): PartialAnalysisResult[] => {
  const tagsToText = (tags: SegmentTag[]): string => tags.map((tag) => `${tag.key}=${tag.value}`).join('&');
  const newResults = results.map((r) => ({ ...r, tagString: tagsToText(r.tags ?? []) }));
  return sortBy(newResults, ['datasetTimestamp', 'analyzerId', 'column', 'tagString']);
};

export const filterAnalyzerResults = (data: {
  data?: { analysisResults?: PartialAnalysisResult[]; paginatedAnalysisResults?: PartialAnalysisResult[] };
}): object => {
  const copy = cloneDeep(data) ?? {};
  copy.data?.analysisResults?.forEach(filterAnalyzerResult);
  if (copy.data?.analysisResults) {
    copy.data.analysisResults = sortAnalyzerResults(copy.data?.analysisResults);
  }
  copy.data?.paginatedAnalysisResults?.forEach(filterAnalyzerResult);
  if (copy.data?.paginatedAnalysisResults) {
    copy.data.paginatedAnalysisResults = sortAnalyzerResults(copy.data?.paginatedAnalysisResults);
  }

  return copy;
};

type PartialAnalyzerRun = {
  runCompleted: number;
  analyzerId: string;
  runId: string;
  failureTypes: string[];
};

export const sortAnalyzerRuns = (results: PartialAnalyzerRun[]): PartialAnalyzerRun[] => {
  return sortBy(results, ['runCompleted', 'runId', 'analyzerId']);
};

export const filterAnalyzerRuns = (data: { data?: { analyzerRuns?: PartialAnalyzerRun[] } }): object => {
  const copy = cloneDeep(data) ?? {};
  if (copy.data?.analyzerRuns) {
    copy.data.analyzerRuns = sortAnalyzerRuns(copy.data?.analyzerRuns);
  }
  copy.data?.analyzerRuns?.forEach((run) => {
    // postgres has more precision
    run.runCompleted = Math.floor(run.runCompleted / 1000) * 1000;
    // treat failureTypes of null and [] the same pending fix
    if (run.failureTypes === null) run.failureTypes = [];
  });
  return copy;
};

const sortRollupResults = (results: MetricRollupResult[]): MetricRollupResult[] => {
  return sortBy(results, ['segmentGroup']);
};

export const filterRollupResults = (data: {
  data?: { dataQueries?: { getSegmentMetricDataRollup: MetricRollupResult[] } };
}): object => {
  const copy = cloneDeep(data) ?? {};
  const queries = copy.data?.dataQueries;
  if (queries) {
    queries.getSegmentMetricDataRollup = sortRollupResults(queries.getSegmentMetricDataRollup);
  }
  return copy;
};

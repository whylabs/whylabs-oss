import * as _ from 'lodash';

import { GetAnalysisRequestParams } from '../../services/data/data-service/queries/analysis-queries';
import { AnalysisResult, SegmentTag } from '../generated/graphql';

/**
 * Filters analysis results by checking if the value of the specified field is in the list of desired values.
 * If no desired values were provided, this function assumes no filter was applied on this field,
 * and the analysis result passes the filter.
 * @param analysisResult Analysis result to check
 * @param field Analysis result property to check
 * @param acceptableValues Set of acceptable values for the field specified above
 */
const filterAnalysisResult = <TKey extends keyof AnalysisResult, TResult extends AnalysisResult[TKey]>(
  analysisResult: AnalysisResult,
  field: TKey,
  acceptableValues?: Set<TResult>,
): boolean => {
  if (!acceptableValues?.size) {
    // if no acceptable values specified, assume result passes the filter
    return true;
  }

  const analysisFieldValue = analysisResult[field] as TResult;
  if (analysisFieldValue === undefined || analysisFieldValue === null) {
    // failed filter: desired values were specified, but the value on the analysis result was null
    // TODO: reconsider this if we ever want to explicitly search for null values
    return false;
  }

  return acceptableValues.has(analysisFieldValue);
};

/**
 * Filters analysis results by checking if any of the Monitors they triggered
 * are in the list of monitor IDs we are interested in
 * @param analysisResult Analysis result to check
 * @param monitorIDs Monitor IDs to filter by
 */
const byMonitorIDs = (analysisResult: AnalysisResult, monitorIDs?: Set<string>): boolean => {
  if (!monitorIDs?.size) {
    // no monitor ID filter specified, all results pass filter
    return true;
  }

  const resultMonitorIds = analysisResult.monitorIds ?? [];
  return resultMonitorIds.some((resultMonitorId) => monitorIDs.has(resultMonitorId));
};

const anomaliesBySegmentTags = (analysisResult: AnalysisResult, filterTags: SegmentTag[] | null): boolean =>
  // if filter tags to filter by were not specified -> pass
  // otherwise, the number of tags on the anomaly must be equal to the number of tags in the filter
  // and all analysis tags must be present in the filter
  filterTags === null ||
  (analysisResult.tags?.length === filterTags.length &&
    analysisResult.tags.every((analysisTag) => filterTags.some((filterTag) => _.isEqual(analysisTag, filterTag))));

/**
 * Filters analysis results by the specified parameters
 * @param results Analysis results to filter
 * @param params Params to filter by
 */
export const filterAnalysisResults = (
  results: readonly AnalysisResult[],
  params: GetAnalysisRequestParams,
): AnalysisResult[] => {
  const { metrics, datasetIds, columns, analyzerTypes, analyzerIDs, monitorIDs, analysisIDs, segmentTags, runIds } =
    params;

  // make sure this covers each field in GetAnalysisRequestParams
  return results.filter(
    (result) =>
      filterAnalysisResult(result, 'metric', metrics) &&
      filterAnalysisResult(result, 'datasetId', datasetIds) &&
      filterAnalysisResult(result, 'column', columns) &&
      filterAnalysisResult(result, 'analyzerType', analyzerTypes) &&
      filterAnalysisResult(result, 'analyzerId', analyzerIDs) &&
      filterAnalysisResult(result, 'analysisId', analysisIDs) &&
      filterAnalysisResult(result, 'runId', runIds) &&
      byMonitorIDs(result, monitorIDs) &&
      anomaliesBySegmentTags(result, segmentTags),
  );
};

import { AdHocMonitorRequestV3, BackfillRequest } from '@whylabs/data-service-node-client';

import { AdhocMonitorRunError, BackfillAnalyzersError } from '../../../errors/dashbird-error';
import { AdHocMonitorJob, BackfillAnalyzersJob } from '../../../graphql/generated/graphql';
import { getLogger } from '../../../providers/logger';
import { callOptionsFromGraphqlCxt } from '../../../util/async-helpers';
import { describeTags } from '../../../util/misc';
import { subDaysUTC } from '../../../util/time';
import { FullGraphQLContext } from '../../context';

const logger = getLogger('AdhocMonitorLogger');

export const runAdhoc = (
  orgId: string,
  datasetId: string,
  request: AdHocMonitorRequestV3,
  runAdhocFunction: (r: AdHocMonitorRequestV3) => Promise<AdHocMonitorJob>,
): Promise<AdHocMonitorJob> => {
  try {
    return runAdhocFunction(request);
  } catch (err) {
    logger.error(
      err,
      'Adhoc V3 Analyzers lambda run failed for org %s, dataset %s, features %s, segments %s',
      orgId,
      datasetId,
      request.columnNames?.join(','),
      request.segmentTags?.map(describeTags).join(','),
    );
    throw new AdhocMonitorRunError('Monitor preview run failed. Please try again later.');
  }
};

export const runBackfillJob = (
  request: BackfillRequest,
  context: FullGraphQLContext,
): Promise<BackfillAnalyzersJob> => {
  try {
    return context.dataSources.dataService.runBackfillAnalyzers(request, callOptionsFromGraphqlCxt(context));
  } catch (err) {
    logger.error(
      err,
      'Backfill Analyzers run failed for org %s, dataset %s, inverval %s and analyzers: %s',
      request.orgId,
      request.datasetId,
      request.interval,
      request.analyzerIds?.join(',') ?? 'All analyzers',
    );
    throw new BackfillAnalyzersError('Analysis backfill request failed. Please try again later.');
  }
};

/**
 * Returns from and to ISO date strings, with from FIRST.
 */
export const setupTimeStrings = (fromTimestamp: number | null | undefined, toTimestamp: number): [string, string] => {
  const from = fromTimestamp ?? subDaysUTC(toTimestamp, 30);
  return [new Date(from).toISOString(), new Date(toTimestamp).toISOString()];
};

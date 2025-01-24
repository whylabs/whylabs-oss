import {
  getGranularityFromResource,
  getIntervalFromResource,
} from '../../../services/data/data-service/api-wrappers/model-metrics';
import { getTracesSummary } from '../../../services/data/data-service/api-wrappers/traces';
import { router, viewResourceDataProcedure } from '../../trpc';
import { callOptionsFromTrpcContext } from '../../util/call-context';
import { commonDateRangeInputSchema } from '../../util/schemas';
import { getParsedSummary } from './utils/llmTraceSummaryUtils';

type TimestampValueData = Array<[number, number | null]>;

export const llmTraceSummary = router({
  list: viewResourceDataProcedure
    .input(commonDateRangeInputSchema)
    .query(async ({ ctx, input: { fromTimestamp, orgId, resourceId, toTimestamp } }) => {
      const callOptions = callOptionsFromTrpcContext(ctx);

      const interval = await getIntervalFromResource({ orgId, resourceId, fromTimestamp, toTimestamp }, callOptions);
      const granularity = await getGranularityFromResource({ orgId, resourceId }, callOptions);

      const commonQuery = {
        granularity,
        interval,
        orgId,
        resourceId,
      };

      const response = await getTracesSummary(commonQuery, callOptions);

      const totalInteractionsWithIssues: TimestampValueData = [];
      let totalInteractionsWithIssuesSum = 0;
      const totalInteractionsWithoutIssues: TimestampValueData = [];
      let totalInteractionsWithoutIssuesSum = 0;

      const tokens: TimestampValueData = [];
      let tokensTotal = 0;

      const latency: TimestampValueData = [];
      let latencyTotal = 0;

      const blockedPolicyActivity: TimestampValueData = [];
      let blockedPolicyActivityTotal = 0;

      response.entries.forEach((entry) => {
        const parsedEntry = getParsedSummary(entry, ctx);
        if (!parsedEntry) return;

        const { dateTime, total, totalLatencyMillis, totalWithPolicyIssues, totalTokens, totalBlocked } = parsedEntry;
        const withPolicyIssues = totalWithPolicyIssues ?? 0;
        totalInteractionsWithIssues.push([dateTime, withPolicyIssues]);
        totalInteractionsWithIssuesSum += withPolicyIssues;

        const withoutIssues = total ? total - (totalWithPolicyIssues ?? 0) : 0;
        totalInteractionsWithoutIssues.push([dateTime, withoutIssues]);
        totalInteractionsWithoutIssuesSum += withoutIssues;

        tokens.push([dateTime, totalTokens ?? null]);
        tokensTotal += totalTokens ?? 0;

        const latencyMillis = totalLatencyMillis ?? 0;
        // Calculate average latency per interaction
        const latencyMillisPerInteraction = total ? latencyMillis / total : null;
        latency.push([dateTime, latencyMillisPerInteraction]);
        latencyTotal += latencyMillisPerInteraction ?? 0;

        const blocked = totalBlocked ?? 0;
        blockedPolicyActivity.push([dateTime, blocked]);
        blockedPolicyActivityTotal += blocked;
      });

      const latencyAverage = latencyTotal / latency.length;
      // Create the data that will be used for the average annotation line, which must be the same length as the latency data
      const latencyAverageData: TimestampValueData = latency.map(([timestamp]) => [timestamp, latencyAverage]);

      const tokensAverage = tokensTotal / tokens.length;
      // Create the data that will be used for the average annotation line, which must be the same length as the tokens data
      const tokensAverageData: TimestampValueData = tokens.map(([timestamp]) => [timestamp, tokensAverage]);

      return {
        latencyPerInteraction: {
          average: latencyAverage,
          averageData: latencyAverageData,
          latency,
        },
        policyActivity: {
          blocked: {
            data: blockedPolicyActivity,
            total: blockedPolicyActivityTotal,
          },
          flagged: {
            data: totalInteractionsWithIssues,
            total: totalInteractionsWithIssuesSum,
          },
        },
        totalInteractions: {
          withIssues: totalInteractionsWithIssues,
          withIssuesSum: totalInteractionsWithIssuesSum,
          withoutIssues: totalInteractionsWithoutIssues,
          withoutIssuesSum: totalInteractionsWithoutIssuesSum,
        },
        totalTokens: {
          average: tokensAverage,
          tokens,
          tokensAverageData,
          total: tokensTotal,
        },
      };
    }),
});

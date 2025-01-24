import { DefaultTracesService } from '../../../services/data/data-service/api-wrappers/traces/traces';
import { getInterval } from '../../../services/data/data-service/data-service-utils';
import { Granularity, TraceSummaryRequest } from '../../../types/api';
import { router, viewResourceDataProcedure } from '../../trpc';
import { callOptionsFromTrpcContext } from '../../util/call-context';
import { commonDateRangeInputSchema } from '../../util/schemas';
import { getParsedSummary } from './utils/llmTraceSummaryUtils';

type TimestampValueData = Array<[number, number | null]>;

const tracesService = new DefaultTracesService();

export const llmTraceSummary = router({
  list: viewResourceDataProcedure
    .input(commonDateRangeInputSchema)
    .query(async ({ ctx, input: { fromTimestamp, resourceId, toTimestamp } }) => {
      const callOptions = callOptionsFromTrpcContext(ctx);

      // TODO: #hadron determine interval based on granularity?
      const interval = getInterval(fromTimestamp, toTimestamp);
      const granularity = Granularity.Hourly;

      const commonQuery: TraceSummaryRequest = {
        granularity,
        interval,
        resourceId,
      };

      const response = await tracesService.getTracesSummary(commonQuery, callOptions);

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

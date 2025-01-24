import { z } from 'zod';

export const summarySchema = z.object({
  dateTime: z.number(),
  total: z.number().nullish(),
  totalBlocked: z.number().nullish(),
  totalWithPolicyIssues: z.number().nullish(),
  totalTokens: z.number().nullish(),
  totalLatencyMillis: z.number().nullish(),
});
export type ParsedLLMTraceSummary = z.infer<typeof summarySchema>;

export const summaryTagSchema = z.object({
  count: z.number(),
  dateTime: z.number(),
  tags: z.string(),
});
export type ParsedLLMTraceTagSummary = z.infer<typeof summaryTagSchema>;

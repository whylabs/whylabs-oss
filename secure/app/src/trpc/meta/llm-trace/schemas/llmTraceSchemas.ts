import { z } from 'zod';

import { recordStringUnknownSchema } from '../../../util/schemas';

const commonSchema = z.object({
  TraceId: z.string().min(1),
  StartTime: z.string(),
  EndTime: z.string(),
  Latency: z.number().nullish(),
  ResourceAttributes: recordStringUnknownSchema,
  Tags: z.array(z.string()).nullish(),
  ApplicationId: z.string().nullish(),
  Version: z.string().nullish(),
});

export const dataServiceTraceSchema = commonSchema.extend({
  Events: z.union([recordStringUnknownSchema, z.array(recordStringUnknownSchema)]).nullish(),
  SpanId: z.string().min(1),
  SpanName: z.string().min(1),
  ParentId: z.string(),
  SpanKind: z.string(),
  TraceAttributes: recordStringUnknownSchema,
});
export type ParsedDataServiceTraceSchema = z.infer<typeof dataServiceTraceSchema> | null;

export const dataServiceListTraceSchema = commonSchema.extend({
  CompletionTokens: z.number().nullish(),
  Events: z.number().nullish(),
  PromptTokens: z.number().nullish(),
  TotalTokens: z.number().nullish(),
  HasCoords: z.boolean().nullish(),
});
export type ParsedDataServiceListTraceSchema = z.infer<typeof dataServiceListTraceSchema> | null;

export const traceSummarySchema = z.object({
  dateTime: z.number().nullish(),
  total: z.number().nullish(),
  totalWithPolicyIssues: z.number().nullish(),
  totalBlocked: z.number().nullish(),
  totalTokens: z.number().nullish(),
  totalLatencyMillis: z.number().nullish(),
});
export type DataServiceTraceSummarySchema = z.infer<typeof traceSummarySchema> | null;

export const traceSummaryTagSchema = z.object({
  dateTime: z.number().nullish(),
  tags: z.string().nullish(),
  count: z.number().nullish(),
});
export type DataServiceTraceSummaryTagSchema = z.infer<typeof traceSummaryTagSchema> | null;

export const traceDetailSchema = commonSchema.extend({
  ResourceId: z.string(),
  SpanId: z.string().min(1),
  ParentId: z.string().nullish(),
  SpanName: z.string().nullish(),
  SpanStatus: z.string().nullish(),
  SpanStatusMessage: z.string().nullish(),
  SpanKind: z.string().min(1),
  Events: z.array(z.string()).nullish(),
  Links: z.array(z.string()).nullish(),
  TraceAttributes: recordStringUnknownSchema,
});
export type DataServiceTraceDetailSchema = z.infer<typeof traceDetailSchema> | null;

export const tokenUsageSchema = z.object({
  'llm.usage.completion_tokens': z.number().nullish(),
  'llm.usage.prompt_tokens': z.number().nullish(),
  'llm.usage.total_tokens': z.number().nullish(),
});

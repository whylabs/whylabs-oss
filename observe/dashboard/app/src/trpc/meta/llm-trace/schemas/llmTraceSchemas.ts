import { z } from 'zod';

import { recordStringUnknownSchema } from '../../../util/schemas';

const commonSchema = z.object({
  TraceId: z.string().min(1),
  StartTime: z.string(),
  EndTime: z.string(),
  Latency: z.number().nullish(),
  HasCoords: z.boolean().nullish(),
  ResourceAttributes: recordStringUnknownSchema,
  Tags: z.array(z.string()).nullish(),
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
  EventsList: z.union([recordStringUnknownSchema, z.array(recordStringUnknownSchema)]).nullish(),
  PromptTokens: z.number().nullish(),
  TotalTokens: z.number().nullish(),
});
export type ParsedDataServiceListTraceSchema = z.infer<typeof dataServiceListTraceSchema> | null;

export const tokenUsageSchema = z.object({
  'llm.usage.completion_tokens': z.number().nullish(),
  'llm.usage.prompt_tokens': z.number().nullish(),
  'llm.usage.total_tokens': z.number().nullish(),
});

import path from 'path';

import { getLogger } from '../../../../providers/logger';
import { TrpcContext } from '../../../trpc';
import { formatTrpcContext } from '../../../trpc-error';
import {
  ParsedLLMTraceSummary,
  ParsedLLMTraceTagSummary,
  summarySchema,
  summaryTagSchema,
} from '../schemas/llmTraceSummarySchemas';

const logger = getLogger(path.parse(__filename).base);

export const getParsedSummary = (entryString: string, ctx: TrpcContext): ParsedLLMTraceSummary | null => {
  try {
    return summarySchema.parse(entryString);
  } catch (error) {
    logger.error({ traceString: entryString, error }, `getParsedSummary error ${formatTrpcContext(ctx)}`);
    return null;
  }
};

export const getParsedTagSummary = (entryString: string, ctx: TrpcContext): ParsedLLMTraceTagSummary | null => {
  try {
    return summaryTagSchema.parse(entryString);
  } catch (error) {
    logger.error({ traceString: entryString, error }, `getParsedTagSummary error ${formatTrpcContext(ctx)}`);
    return null;
  }
};

import { z } from 'zod';

export const intervalSchema = z.object({
  fromTimestamp: z.number(),
  toTimestamp: z.number().nullish(),
});

export const resourceSchema = z.object({ resourceId: z.string().min(1) });

export const paginatedSchema = z.object({
  limit: z.number().min(1).max(1000).default(30),
  offset: z.number(),
});

export const commonDateRangeInputSchema = resourceSchema.merge(intervalSchema);

export const recordStringUnknownSchema = z.record(z.string(), z.unknown());

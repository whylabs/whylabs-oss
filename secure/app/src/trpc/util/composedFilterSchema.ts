import { z } from 'zod';

export const filterSchema = z.object({
  condition: z.string().nullable().optional(),
  dimension: z.string().nullable().optional(),
  value: z.string().nullable().optional(),
});

export const filtersListSchema = z.array(filterSchema);
export type FiltersList = z.infer<typeof filtersListSchema>;

export const readyToQueryFilter = z.object({
  condition: z.string().nullish(),
  dimension: z.string(),
  value: z.string(),
});
export type ReadyToQueryFilter = z.infer<typeof readyToQueryFilter>;

export const readyToQueryFiltersSchema = z.object({
  composedFilters: z.array(readyToQueryFilter).optional(),
});

import { Condition, EmbeddingType, SpanBehaviorType } from '@whylabs/data-service-node-client';
import { EnumLike, z } from 'zod';

import { DEMO_GLOBAL_ORG_ID } from '../../constants';
import { DEMO_ORG_ID } from '../../graphql/authz/user-context';
import { GranularityInclusion, SortDirection, TimePeriod } from '../../graphql/generated/graphql';
import { readyToQueryFiltersSchema } from './composedFilterSchema';

export const segmentSchema = z.object({
  key: z.string(),
  value: z.string(),
});

export const segmentTagsSchema = z.array(segmentSchema);

export const withSegmentsSchema = z.object({ segment: segmentTagsSchema });

export const intervalSchema = z.object({
  fromTimestamp: z.number(),
  toTimestamp: z.number().nullish(),
});

export const orgSchema = z.object({
  orgId: z
    .string()
    .min(1)
    .transform((value) => {
      // Transform it to the actual demo org instead of 'demo' string
      if (DEMO_ORG_ID && value === DEMO_GLOBAL_ORG_ID) {
        return DEMO_ORG_ID;
      }
      return value;
    }),
});

export const resourceSchema = z.object({ resourceId: z.string().min(1) });

export const requiredOrgAndResourceSchema = orgSchema.merge(resourceSchema);

export const searchTermSchema = z.object({ searchTerm: z.string().nullish() });

export const paginatedSchema = z.object({
  limit: z.number().min(1).max(1000).default(30),
  offset: z.number(),
});

export const commonDateRangeInputSchema = requiredOrgAndResourceSchema.merge(intervalSchema);

export const analysisCommonInputSchema = z.object({
  analyzerIds: z.array(z.string().min(1)),
  timePeriod: z.nativeEnum(TimePeriod).nullish(),
  granularityInclusion: z.nativeEnum(GranularityInclusion).nullish(),
});

export const analyzerResultsInputSchema = analysisCommonInputSchema.merge(
  z.object({
    onlyAnomalies: z.boolean().default(false),
  }),
);

export const recordStringUnknownSchema = z.record(z.string(), z.unknown());

export const embeddingSpanFilter = z.object({
  embeddingsFilter: z
    .object({
      tags: z.array(z.string()).nullish(),
      tagCondition: z.nativeEnum(Condition).nullish(),
      behaviorType: z.nativeEnum(SpanBehaviorType).nullish(),
      embeddingType: z.nativeEnum(EmbeddingType).nullish(),
      traceIdSubstring: z.string().optional(),
      spanIds: z.array(z.string()).nullish(),
    })
    .nullish(),
});

export const tracesEmbeddingsFiltersSchema = z
  .object({
    traceIds: z.array(z.string()).nullish(),
    excludeIds: z.array(z.string()).nullish(),
  })
  .merge(readyToQueryFiltersSchema)
  .merge(embeddingSpanFilter)
  .merge(paginatedSchema);

export const embeddingsAssetDataVersion = z.object({
  dataTag: z.string().optional(),
  version: z.number().optional(),
});

export const sortDirectionSchema = z.object({
  sortDirection: z.nativeEnum(SortDirection).optional().default(SortDirection.Desc),
});

/**
 * Creates a Zod schema for sorting by a specified enum.
 *
 * This function generates a Zod schema that preprocesses the input value to ensure it is a valid
 * enum value. If the input value is not valid, it defaults to a specified key from the enum.
 *
 * @template T - The enum type.
 * @param nativeEnum - The enum to create the schema for.
 * @param defaultKey - The default key to use if the input value is not valid.
 * @returns A Zod schema that validates and preprocesses the input value.
 */
export const createSortBySchema = <T extends EnumLike>(
  nativeEnum: T,
  defaultKey: keyof T,
): z.ZodDefault<z.ZodOptional<z.ZodNativeEnum<T>>> => {
  // @ts-expect-error - The Zod schema is valid, but the type is not inferred correctly
  return z.preprocess((value) => {
    // Validate if the input value is a valid for the schema enum
    if (typeof value === 'string' && Object.values(nativeEnum).includes(value)) {
      return value;
    }

    // If the value is not valid, return the default value instead of throwing an error
    return nativeEnum[defaultKey];
  }, z.nativeEnum(nativeEnum).optional().default(nativeEnum[defaultKey]));
};

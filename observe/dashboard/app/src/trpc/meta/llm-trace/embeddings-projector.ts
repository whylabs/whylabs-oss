import { SortCondition, TraceListFilter } from '@whylabs/data-service-node-client';
import { z } from 'zod';

import {
  EmbeddingsSeries,
  getEmbeddingsDataByTraceListFilter,
  getTracesEmbeddingsData,
  getWhyLabsDatasetsEmbeddingsData,
  getWhyLabsEmbeddingsContent,
} from '../../../services/data/songbird/api-wrappers/embeddings';
import { typeSafeEntries } from '../../../util/array-utils';
import { isValidNumber } from '../../../util/type-guards';
import { authenticatedProcedure, router, viewResourceDataProcedureWithDateInterval } from '../../trpc';
import { callOptionsFromTrpcContext } from '../../util/call-context';
import { embeddingsAssetDataVersion, tracesEmbeddingsFiltersSchema } from '../../util/schemas';
import { mountTraceListHeaderFilters } from './utils/llmTraceUtils';

const traceIdFilters: (keyof TraceListFilter)[] = ['traceIdSubstring', 'traceIds', 'excludeIds'];

export const embeddingsProjector = router({
  getEmbeddingsDatasets: authenticatedProcedure
    .input(embeddingsAssetDataVersion)
    .query(async ({ ctx, input: { dataTag, version } }): Promise<[string, EmbeddingsSeries][]> => {
      const validParams = !!(dataTag && isValidNumber(version));
      const callOptions = callOptionsFromTrpcContext(ctx);
      return getWhyLabsDatasetsEmbeddingsData(
        validParams ? dataTag : undefined,
        validParams ? version : undefined,
        callOptions,
      );
    }),
  getEmbeddingsContent: authenticatedProcedure
    .input(
      z.object({
        ids: z.array(z.string()),
      }),
    )
    .query(async ({ ctx, input: { ids } }): Promise<[string, string][]> => {
      const callOptions = callOptionsFromTrpcContext(ctx);
      const result = await getWhyLabsEmbeddingsContent(ids, callOptions);
      return result?.uids?.map((uid, index) => [uid, result?.text?.[index] ?? '']) ?? [];
    }),
  getTracesEmbeddings: viewResourceDataProcedureWithDateInterval
    .input(tracesEmbeddingsFiltersSchema)
    .query(async ({ input, ctx }) => {
      const { fromTimestamp, toTimestamp, composedFilters, embeddingsFilter, traceIds, excludeIds, ...rest } = input;
      const filter = mountTraceListHeaderFilters(composedFilters);
      const data = await (() => {
        const usedTraceIds = (traceIds ?? []).concat(filter?.traceIds ?? []);
        const hasSpecifiedEntries = !!usedTraceIds?.length && !excludeIds?.length && !embeddingsFilter?.spanIds?.length;
        const hasParentTracesFilters = !!typeSafeEntries(filter)?.find(([key]) => !traceIdFilters.includes(key));
        if (hasParentTracesFilters && !hasSpecifiedEntries) {
          /* this query makes an inner join between the TraceListView and traces table
            / we should call it only when we have filters that has to be applied to the parent traces
            / and we don't have specified trace Ids
           */
          return getEmbeddingsDataByTraceListFilter(
            {
              dateRange: { fromTimestamp, toTimestamp },
              filter: {
                ...filter,
                traceIds: usedTraceIds,
                excludeIds,
              },
              spanFilter: embeddingsFilter ?? {},
              sortCondition: SortCondition.Timestamp,
              ...rest,
            },
            callOptionsFromTrpcContext(ctx),
          );
        }
        return getTracesEmbeddingsData(
          {
            dateRange: { fromTimestamp, toTimestamp },
            filter: {
              traceIds: usedTraceIds,
              excludeIds,
              traceIdSubstring: filter.traceIdSubstring ?? undefined,
              ...embeddingsFilter,
            },
            ...rest,
          },
          callOptionsFromTrpcContext(ctx),
        );
      })();
      const { entries, ...responseRest } = data ?? {};
      return {
        series: Object.entries(entries ?? {}),
        ...responseRest,
      };
    }),
});

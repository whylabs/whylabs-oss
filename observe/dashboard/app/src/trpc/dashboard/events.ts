import { z } from 'zod';

import { getDebugEvents } from '../../services/data/data-service/api-wrappers/events';
import { getInterval } from '../../services/data/data-service/data-service-utils';
import { router, viewResourceDataProcedureWithDateInterval } from '../trpc';
import { callOptionsFromTrpcContext } from '../util/call-context';
import { createSortBySchema, paginatedSchema, sortDirectionSchema } from '../util/schemas';
import { DebugEventsOrderByEnum } from './types/events';

const sortBySchema = createSortBySchema(DebugEventsOrderByEnum, 'CreationTimestamp');

export const events = router({
  describeContent: viewResourceDataProcedureWithDateInterval
    .input(
      z.object({
        traceId: z.string().min(1),
      }),
    )
    .query(async ({ input, ctx }) => {
      const { orgId, resourceId, fromTimestamp, toTimestamp, traceId } = input;

      if (!traceId) return [];
      const data = await getDebugEvents(
        {
          orgId,
          datasetId: resourceId,
          interval: getInterval(fromTimestamp, toTimestamp),
          traceId,
        },
        callOptionsFromTrpcContext(ctx),
      );
      return data?.events.map((e) => e.content) ?? [];
    }),
  list: viewResourceDataProcedureWithDateInterval
    .input(
      paginatedSchema
        .extend({
          searchText: z.string().optional(), // This isn't implemented yet
          sortBy: sortBySchema,
        })
        .merge(sortDirectionSchema),
    )
    .query(async ({ input, ctx }) => {
      const { orgId, resourceId, fromTimestamp, toTimestamp, limit, offset, sortBy, sortDirection } = input;
      const req = {
        orgId,
        datasetId: resourceId,
        interval: getInterval(fromTimestamp, toTimestamp),
        limit,
        offset,
        sortBy,
        sortDirection,
      };
      return getDebugEvents(req, callOptionsFromTrpcContext(ctx));
    }),
});

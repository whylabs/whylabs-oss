import { z } from 'zod';

import { listColumnActiveMonitors, listMonitorTargetColumns } from '../../services/data/monitor/monitor-targets';
import { router, viewDataProcedure } from '../trpc';
import { callOptionsFromTrpcContext } from '../util/call-context';
import { requiredOrgAndResourceSchema, withSegmentsSchema } from '../util/schemas';

export const monitors = router({
  listTargetColumns: viewDataProcedure
    .input(
      z
        .object({
          monitorId: z.string(),
        })
        .merge(requiredOrgAndResourceSchema),
    )
    .query(
      async ({ input: { orgId, resourceId, monitorId }, ctx }): Promise<string[]> =>
        listMonitorTargetColumns(orgId, resourceId, monitorId, callOptionsFromTrpcContext(ctx)),
    ),
  listMonitorsByColumn: viewDataProcedure
    .input(
      z
        .object({
          columnId: z.string(),
        })
        .merge(requiredOrgAndResourceSchema)
        .merge(withSegmentsSchema),
    )
    .query(
      async ({ input: { orgId, resourceId, columnId, segment }, ctx }): Promise<string[]> =>
        listColumnActiveMonitors(orgId, resourceId, columnId, segment, callOptionsFromTrpcContext(ctx)),
    ),
});

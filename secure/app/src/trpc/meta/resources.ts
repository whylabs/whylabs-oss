import { z } from 'zod';

import { resourceTimerange } from '../../generated/client/sql';
import { prisma } from '../../orm/config/client';
import { ResourceWithAvailability, TimePeriod } from '../../types/api';
import { router, viewDataProcedure } from '../trpc';

const resourceSchema = z.object({
  id: z.string().min(1),
});

const listResources = async () => {
  const res: resourceTimerange.Result[] = await prisma.$queryRawTyped(resourceTimerange());
  return res.map((r) => {
    const rwa: ResourceWithAvailability = {
      id: r.resource_id,
      name: r.resource_id,
      timePeriod: TimePeriod.Pt1H,
      creationTime: r.creation_time?.getTime() ?? 0,
      modelCategory: 'category',
      active: true,
      dataAvailability: {
        oldestTimestamp: r.start_ts?.getTime(),
        latestTimestamp: r.end_ts?.getTime(),
      },
    };
    return rwa;
  });
};

const resources = router({
  list: viewDataProcedure
    .input(
      z.object({
        orderByTimePeriod: z.boolean().nullish(),
        withAvailability: z.boolean().nullish(),
      }),
    )
    .query(listResources),
  describe: viewDataProcedure.input(resourceSchema).query(async ({ input: { id } }) => {
    const list = await listResources();
    return list.find((r) => r.id === id) ?? null;
  }),
});

export default resources;

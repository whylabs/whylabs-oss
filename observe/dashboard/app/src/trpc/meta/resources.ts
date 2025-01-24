import { z } from 'zod';

import {
  gqlAssetTypeToContract,
  gqlTimePeriodToContract,
} from '../../graphql/contract-converters/songbird/model-converters';
import { ModelType, TimePeriod } from '../../graphql/generated/graphql';
import {
  downloadNumericMetricByProfile,
  getNumericMetricByProfile,
} from '../../services/data/data-service/api-wrappers/numeric-metrics';
import { listResourceTags } from '../../services/data/data-service/api-wrappers/resource-tagging';
import {
  getDataAvailability,
  getProfileRangeByTimestamp,
} from '../../services/data/data-service/api-wrappers/time-boundary';
import { getInterval } from '../../services/data/data-service/data-service-utils';
import { listReferenceProfiles } from '../../services/data/songbird/api-wrappers/profiles';
import {
  ResourceWithAvailability,
  createModel,
  deactivateModel,
  getModel,
  getModels,
} from '../../services/data/songbird/api-wrappers/resources';
import { mapStringToTimePeriod } from '../../util/time-period-utils';
import { isNumber } from '../../util/type-guards';
import {
  manageResourcesProcedure,
  router,
  viewDataProcedure,
  viewResourceDataProcedure,
  viewResourceDataProcedureWithDateInterval,
} from '../trpc';
import { callOptionsFromTrpcContext } from '../util/call-context';
import { Granularity } from '../util/enums';
import { orgSchema, segmentTagsSchema, withSegmentsSchema } from '../util/schemas';

const resourceSchema = orgSchema.extend({
  id: z.string().min(1),
});

const resources = router({
  list: viewDataProcedure
    .input(
      z.object({
        filterByType: z.nativeEnum(ModelType).nullish(),
        orderByTimePeriod: z.boolean().nullish(),
        withAvailability: z.boolean().nullish(),
      }),
    )
    .query(
      async ({
        input: { filterByType, orgId, orderByTimePeriod, withAvailability },
        ctx,
      }): Promise<ResourceWithAvailability[]> => {
        const resources = await getModels(orgId, callOptionsFromTrpcContext(ctx), withAvailability ?? false);
        if (orderByTimePeriod) {
          resources.sort((a, b) => {
            const aTimePeriod = mapStringToTimePeriod.get(a.timePeriod) ?? TimePeriod.Unknown;
            const bTimePeriod = mapStringToTimePeriod.get(b.timePeriod) ?? TimePeriod.Unknown;

            // If the time periods are the same then we don't need to sort
            if (aTimePeriod === bTimePeriod) return a.name.localeCompare(b.name);

            // Order must be
            // 0. hourly
            // 1. daily
            // 2. weekly
            // 3. monthly
            // 4. other
            const timePeriodOrder = [
              TimePeriod.Pt1H,
              TimePeriod.P1D,
              TimePeriod.P1W,
              TimePeriod.P1M,
              TimePeriod.Unknown,
            ];

            return (
              timePeriodOrder.indexOf(aTimePeriod) - timePeriodOrder.indexOf(bTimePeriod) ||
              a.name.localeCompare(b.name)
            );
          });
        }

        if (filterByType) {
          return resources.filter(({ modelType }) => modelType === filterByType);
        }

        return resources;
      },
    ),
  describe: viewDataProcedure.input(resourceSchema).query(async ({ input: { id, orgId }, ctx }) => {
    return getModel(orgId, id, callOptionsFromTrpcContext(ctx));
  }),
  delete: manageResourcesProcedure.input(resourceSchema).mutation(async ({ input: { id, orgId }, ctx }) => {
    const res = await deactivateModel(orgId, id, callOptionsFromTrpcContext(ctx));
    return !!res;
  }),
  create: manageResourcesProcedure
    .input(
      orgSchema.extend({
        name: z.string().length(128),
        timePeriod: Granularity.nullish(),
        type: z.nativeEnum(ModelType).nullish(),
        id: z.string().max(64).nullish(),
      }),
    )
    .mutation(async ({ input: { id, name, orgId, timePeriod, type }, ctx }) => {
      const res = await createModel(
        orgId,
        name,
        gqlTimePeriodToContract(timePeriod ?? TimePeriod.P1D),
        type ? gqlAssetTypeToContract(type) : undefined,
        id ?? undefined,
        callOptionsFromTrpcContext(ctx),
      );
      return !!res;
    }),
  individualProfiles: viewResourceDataProcedureWithDateInterval // this isn't resources metadata, should be in a profiles query
    .input(
      z.object({
        column: z.string().min(1),
        limit: z.number().nullish(),
        metric: z.string().min(1),
        segment: segmentTagsSchema,
      }),
    )
    .query(async ({ ctx, input: { column, resourceId, fromTimestamp, toTimestamp, ...rest } }) => {
      return getNumericMetricByProfile(
        {
          interval: getInterval(fromTimestamp, toTimestamp),
          datasetId: resourceId,
          columnName: column,
          ...rest,
        },
        callOptionsFromTrpcContext(ctx),
      );
    }),
  downloadIndividualProfile: viewResourceDataProcedureWithDateInterval // this isn't resources metadata, should be in a profiles query
    .input(
      z.object({
        column: z.string().min(1),
        metric: z.string().min(1),
        segment: segmentTagsSchema,
      }),
    )
    .query(async ({ ctx, input: { column, metric, orgId, resourceId, segment, fromTimestamp, toTimestamp } }) => {
      return downloadNumericMetricByProfile(
        {
          orgId,
          interval: getInterval(fromTimestamp, toTimestamp),
          datasetId: resourceId,
          columnName: column,
          metric,
          segment,
        },
        callOptionsFromTrpcContext(ctx),
      );
    }),
  listReferenceProfiles: viewResourceDataProcedure.query(async ({ ctx, input: { orgId, resourceId } }) => {
    const result = await listReferenceProfiles(
      orgId,
      resourceId,
      0, // these allow filtering on upload timestamps, but this isn`t usually intended
      Date.now(),
      callOptionsFromTrpcContext(ctx),
    );

    if (!result) return [];

    type ValidReferenceProfile = {
      alias: string;
      id: string;
    };

    const list: ValidReferenceProfile[] = [];
    result.forEach(({ alias, id }) => {
      // We only want to return reference profiles that have an id
      if (id) {
        list.push({
          alias: alias || id,
          id,
        });
      }
    });

    return list;
  }),
  dataLineage: viewDataProcedure
    .input(resourceSchema.merge(withSegmentsSchema))
    .query(async ({ ctx, input: { orgId, id, segment } }) => {
      const options = callOptionsFromTrpcContext(ctx);
      const resourceData = await getModel(orgId, id, options);
      const timePeriod = mapStringToTimePeriod.get(resourceData?.timePeriod ?? '') ?? TimePeriod.P1D;
      const resourcesAvailability = await getDataAvailability(
        { orgId, tags: segment, timePeriod },
        [{ datasetId: id }],
        options,
      );
      const dataAvailability = resourcesAvailability.get(id);
      const timestamps = [dataAvailability?.oldestTimestamp, dataAvailability?.latestTimestamp].filter(isNumber);
      const batches = await Promise.all(
        timestamps.map((ts) => getProfileRangeByTimestamp(orgId, id, timePeriod, ts, options)),
      );
      const [oldestRange, latestRange] = batches;
      if (!oldestRange || !latestRange) return null;
      return {
        oldestProfileTimestamp: oldestRange.fromTimestamp,
        latestProfileTimestamp: latestRange.fromTimestamp,
      };
    }),
  listTags: viewDataProcedure
    .input(resourceSchema)
    .query(async ({ input: { orgId, id }, ctx }) => listResourceTags(orgId, id, callOptionsFromTrpcContext(ctx))),
});

export default resources;

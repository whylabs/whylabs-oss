import path from 'path';

import { CustomDashboardUpsertRequest } from '@whylabs/data-service-node-client';
import { z } from 'zod';

import { SortDirection } from '../../graphql/generated/graphql';
import { getLogger } from '../../providers/logger';
import {
  DataServiceCustomDashboard,
  cloneDashboard,
  deleteDashboard,
  findDashboard,
  listDashboards,
  upsertDashboards,
} from '../../services/data/data-service/api-wrappers/custom-dashboards';
import { sortAsc, sortDesc } from '../../util/misc';
import { manageDashboardsProcedure, router, viewDataProcedure } from '../trpc';
import { callOptionsFromTrpcContext } from '../util/call-context';
import { createSortBySchema, sortDirectionSchema } from '../util/schemas';
import { CustomDashboardOrderByEnum, CustomDashboardSchema } from './types/dashboards';
import { customDashboardSchemaValidate, parseFromDataServiceDashboard } from './util/CustomDashboardSchemaParser';
import { ORG_DASHBOARD_LOCATION_TEXT, readUsedOnDashboard } from './util/dashboardUtils';

const logger = getLogger(path.parse(__filename).name);

export type CustomDashboardUpsertInputType = Pick<CustomDashboardUpsertRequest, 'id' | 'displayName' | 'isFavorite'> & {
  orgId: string;
  schema?: Omit<CustomDashboardSchema, 'version'>;
};
export type CustomDashboardListItem = Omit<DataServiceCustomDashboard, 'schema'> &
  Pick<CustomDashboardSchema, 'dateRange'> & {
    location: string;
  };

export type ParsedCustomDashboard = Omit<DataServiceCustomDashboard, 'schema'> & {
  schema?: CustomDashboardSchema | null;
};

type ListOutputType = {
  lastVisited: {
    id: string;
    name: string;
  } | null;
  list: CustomDashboardListItem[];
  totalCount: number;
};

const stringifyDashboardSchema = (schema: CustomDashboardSchema): string | null => {
  if (customDashboardSchemaValidate(schema)) {
    return JSON.stringify(schema);
  }
  return null;
};

export const customDashboard = router({
  list: viewDataProcedure
    .input(
      z
        .object({
          searchText: z.string().optional(),
          sortBy: createSortBySchema(CustomDashboardOrderByEnum, 'CreationTimestamp'),
        })
        .merge(sortDirectionSchema),
    )
    .query(async ({ input: { orgId, searchText, sortBy, sortDirection }, ctx }): Promise<ListOutputType> => {
      const list = await listDashboards(orgId, callOptionsFromTrpcContext(ctx));
      const filteredList: CustomDashboardListItem[] = [];

      list.forEach((d) => {
        // Filter by search text
        if (
          !!searchText &&
          !d.displayName.toLowerCase().includes(searchText.toLowerCase()) &&
          !d.id.toLowerCase().includes(searchText.toLowerCase())
        )
          return;

        const schema = parseFromDataServiceDashboard(d);

        const { author, creationTimestamp, displayName, id, isFavorite, lastUpdatedTimestamp } = d;
        const { dateRange } = parseFromDataServiceDashboard(d) ?? {};

        const location = (() => {
          const usedOn = readUsedOnDashboard(schema?.metadata?.usedOn);
          if (usedOn?.meta === 'resource' && usedOn.resourceId) {
            return usedOn.resourceId;
          }

          return ORG_DASHBOARD_LOCATION_TEXT;
        })();

        filteredList.push({
          author,
          creationTimestamp,
          dateRange,
          displayName,
          id,
          isFavorite,
          orgId,
          lastUpdatedTimestamp,
          location,
        });
      });

      filteredList.sort((a, b) => {
        const sortFn = sortDirection === SortDirection.Asc ? sortAsc : sortDesc;

        switch (sortBy) {
          case CustomDashboardOrderByEnum.ID:
            if (!a.id) return b.id ? 1 : 0;
            if (!b.id) return a.id ? -1 : 0;
            return sortFn(a.id, b.id);

          case CustomDashboardOrderByEnum.Author:
            if (!a.author) return b.author ? 1 : 0;
            if (!b.author) return a.author ? -1 : 0;
            return sortFn(a.author, b.author);

          case CustomDashboardOrderByEnum.DisplayName:
            return sortFn(a.displayName, b.displayName);

          case CustomDashboardOrderByEnum.Location:
            return sortFn(a.location, b.location);

          case CustomDashboardOrderByEnum.LastUpdatedTimestamp:
            if (!a.lastUpdatedTimestamp) return b.lastUpdatedTimestamp ? 1 : 0;
            if (!b.lastUpdatedTimestamp) return a.lastUpdatedTimestamp ? -1 : 0;
            return sortFn(a.lastUpdatedTimestamp, b.lastUpdatedTimestamp);

          default:
            if (!a.creationTimestamp) return b.creationTimestamp ? 1 : 0;
            if (!b.creationTimestamp) return a.creationTimestamp ? -1 : 0;
            return sortFn(a.creationTimestamp, b.creationTimestamp);
        }
      });

      return {
        lastVisited: null, // TODO: to be implemented here: https://app.clickup.com/t/86az4cx58
        list: filteredList,
        totalCount: list.length,
      };
    }),
  describe: viewDataProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }): Promise<ParsedCustomDashboard | null> => {
      const { id, orgId } = input;
      try {
        const dashboard = await findDashboard(orgId, id, callOptionsFromTrpcContext(ctx));
        return {
          ...dashboard,
          schema: parseFromDataServiceDashboard(dashboard),
        };
      } catch (error) {
        logger.error(error, 'Failed to fetch custom dashboard');
        return null;
      }
    }),
  listByUsedOnMetadata: viewDataProcedure
    .input(z.object({ usedOn: z.string() }))
    .query(async ({ input: { usedOn, orgId }, ctx }): Promise<ParsedCustomDashboard[]> => {
      const dashboards = await listDashboards(orgId, callOptionsFromTrpcContext(ctx));
      const list: ParsedCustomDashboard[] = [];

      dashboards.forEach((dashboard) => {
        const schema = parseFromDataServiceDashboard(dashboard);

        // Filter it by usedOn metadata
        if (schema?.metadata?.usedOn === usedOn) {
          list.push({ ...dashboard, schema });
        }
      });
      return list;
    }),
  upsert: manageDashboardsProcedure
    .input((object: unknown) => object as CustomDashboardUpsertInputType)
    .mutation(async ({ input: { orgId, schema, ...rest }, ctx }) => {
      // version should be updated only if the schema changed in a breaking way
      // and should be accompanied by a migration from previous version
      const version = 2;

      const schemaString = schema && stringifyDashboardSchema({ ...schema, version });
      if (!schema) return false;

      const userEmail = ctx?.userMetadata?.email;
      const data: CustomDashboardUpsertRequest = {
        displayName: rest.displayName,
        id: rest.id,
        author: userEmail ?? 'Unknown',
        schema: schemaString ?? undefined,
      };
      const dashboard = await upsertDashboards(orgId, data, callOptionsFromTrpcContext(ctx));
      return {
        id: dashboard.id,
        displayName: dashboard.displayName,
      };
    }),
  delete: manageDashboardsProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ input, ctx }): Promise<void> => {
      const { id, orgId } = input;
      return deleteDashboard(orgId, id, callOptionsFromTrpcContext(ctx));
    }),
  clone: manageDashboardsProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ input, ctx }): Promise<void> => {
      const userEmail = ctx?.userMetadata?.email;
      const { id, orgId } = input;
      return cloneDashboard(orgId, id, userEmail, callOptionsFromTrpcContext(ctx));
    }),
});

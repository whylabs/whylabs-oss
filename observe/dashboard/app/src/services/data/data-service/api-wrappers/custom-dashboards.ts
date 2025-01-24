import {
  CustomDashboardUpsertRequest,
  CustomDashboard as DataServiceCustomDashboard,
} from '@whylabs/data-service-node-client';

import { CallOptions, axiosCallConfig, tryCall } from '../../../../util/async-helpers';
import { logger } from '../../songbird/api-wrappers/utils';
import { dataServiceClient } from '../data-service-client-factory';

export type { DataServiceCustomDashboard };

export const listDashboards = async (orgId: string, options?: CallOptions): Promise<DataServiceCustomDashboard[]> => {
  logger.info('Listing custom dashboards for org %s', orgId);
  const client = options?.context?.dataServiceClient ?? dataServiceClient;
  const response = await tryCall(() => client.customDashboards.list(orgId, axiosCallConfig(options)), options);
  return response.data;
};

export const findDashboard = async (
  orgId: string,
  dashboardId: string,
  options?: CallOptions,
): Promise<DataServiceCustomDashboard> => {
  logger.info('Searching custom dashboard by id %s', dashboardId);
  const client = options?.context?.dataServiceClient ?? dataServiceClient;
  const response = await tryCall(
    () => client.customDashboards.findById(orgId, dashboardId, axiosCallConfig(options)),
    options,
  );
  return response.data;
};

export const upsertDashboards = async (
  orgId: string,
  dashboard: CustomDashboardUpsertRequest,
  options?: CallOptions,
): Promise<DataServiceCustomDashboard> => {
  logger.info('Upsert dashboard org %s', JSON.stringify(dashboard));
  const client = options?.context?.dataServiceClient ?? dataServiceClient;
  const response = await tryCall(
    () => client.customDashboards.saveCustomDashboard(orgId, dashboard, axiosCallConfig(options)),
    options,
  );
  return response.data;
};

export const cloneDashboard = async (
  orgId: string,
  id: string,
  author = 'Unknown',
  options?: CallOptions,
): Promise<void> => {
  logger.info('Cloning custom dashboard %s', id);
  const client = options?.context?.dataServiceClient ?? dataServiceClient;
  await tryCall(() => client.customDashboards.clone(orgId, { author, id }, axiosCallConfig(options)), options);
};

export const deleteDashboard = async (orgId: string, id: string, options?: CallOptions): Promise<void> => {
  logger.info('Marking custom dashboard %s as deleted', id);
  const client = options?.context?.dataServiceClient ?? dataServiceClient;
  await tryCall(() => client.customDashboards.deleteDashboard(orgId, id, axiosCallConfig(options)), options);
};

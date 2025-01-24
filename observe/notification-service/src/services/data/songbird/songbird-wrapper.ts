import {
  EntitySchema,
  ModelMetadataResponse,
  NotificationAction,
  OrganizationMetadata,
  User,
  UserApiKey,
} from '@whylabs/songbird-node-client';
import { getLogger } from '../../../providers/logger';
import { songbirdClient } from './songbird-client-factory';
import { AcknowledgeNotificationRequest } from '@whylabs/songbird-node-client/dist/api';

const logger = getLogger('SongbirdWrapper');

export interface Monitor {
  id: string;
  displayName?: string;
  actions?: Array<MonitorAction>;
}

export interface Analyzer {
  id: string;
  displayName?: string;
  tags?: Array<string>;
  targetMatrix?: AnalyzerTargetMatrix;
  config?: AnalyzerConfig;
  constraintDefinition?: string;
}

export interface AnalyzerTargetMatrix {
  type?: string;
}

export interface AnalyzerConfig {
  metric?: string;
}

interface MonitorAction {
  // hardcoded ID of the notification route or UUID of the target action
  target?: 'email' | 'slack' | 'pagerDuty' | string;
  type?: 'global' | string; // TODO: import other values from monitor config schema
}

interface SongbirdError extends Error {
  response: {
    status: number;
  };
}

// try to get metadata, catch 404s and return null
const tryGetMetadata = async <T>(getter: () => Promise<T>): Promise<T | null> => {
  try {
    return await getter();
  } catch (err) {
    const error = err as SongbirdError;
    if (error.response?.status === 404) {
      logger.warn('Could not find metadata for this org/model');
      return null;
    }
    throw err;
  }
};

export const getModel = async (orgId: string, datasetId: string): Promise<ModelMetadataResponse | null> => {
  logger.info('Fetching model of dataset %s, org %s', datasetId, orgId);
  const models = await tryGetMetadata(() => songbirdClient.models.getModel(orgId, datasetId));
  return models?.data ?? null;
};

export const getEntitySchema = async (orgId: string, datasetId: string): Promise<EntitySchema | null> => {
  const schema = await tryGetMetadata(() => songbirdClient.models.getEntitySchema(orgId, datasetId));
  return schema?.data ?? null;
};

export const getMonitor = async (orgId: string, datasetId: string, monitorId: string): Promise<Monitor | null> => {
  logger.info('Fetching monitor for org %s dataset %s monitor %s', orgId, datasetId, monitorId);
  const config = await tryGetMetadata(() => songbirdClient.monitor.getMonitor(orgId, datasetId, monitorId));
  if (config == null) {
    return null;
  }
  return {
    ...(config.data as unknown as Monitor),
    id: monitorId,
  };
};

export const getApiKey = async (orgId: string, keyId: string): Promise<UserApiKey | null> => {
  logger.info('Fetching api key for key id %s in org %s', keyId, orgId);
  const key = await tryGetMetadata(() => songbirdClient.apiKeys.getApiKey(orgId, keyId));
  return key?.data.key ?? null;
};

export const getOrganization = async (orgId: string): Promise<OrganizationMetadata | null> => {
  logger.info('Fetching org metadata for %s', orgId);
  const org = await tryGetMetadata(() => songbirdClient.organizations.getOrganization(orgId));

  if (!org?.data) {
    return null;
  }

  // TODO: fetch observatoryURL from dashbird
  const baseUrl =
    !org.data.observatoryUrl || org.data.observatoryUrl.trim().length == 0
      ? 'https://hub.whylabsapp.com'
      : org.data.observatoryUrl;

  return {
    ...org.data,
    observatoryUrl: baseUrl,
  } as OrganizationMetadata;
};

export const getUser = async (userId: string): Promise<User | null> => {
  logger.info('Fetching user for user id %s', userId);
  const user = await tryGetMetadata(() => songbirdClient.users.getUser(userId));
  return user?.data ?? null;
};

export const getNotificationAction = async (orgId: string, actionId: string): Promise<NotificationAction | null> => {
  const action = await tryGetMetadata(() => songbirdClient.notifications.getNotificationAction(orgId, actionId));

  return action?.data ?? null;
};

export const listConstraints = async (orgId: string, datasetId: string): Promise<Analyzer[]> => {
  const constraints = await tryGetMetadata(() => songbirdClient.monitor.listConstraints(orgId, datasetId));
  return (constraints?.data ?? []).map((constraint) => JSON.parse(constraint) as Analyzer);
};

export const getAnalyzer = async (orgId: string, datasetId: string, analzyerId: string): Promise<Analyzer | null> => {
  const analyzer = await tryGetMetadata(() => songbirdClient.monitor.getAnalyzer(orgId, datasetId, analzyerId));
  if (analyzer == null) {
    return null;
  }
  return {
    ...(analyzer.data as unknown as Analyzer),
    id: analzyerId,
  };
};

export const ackMessage = async (orgId: string, datasetId: string, runId: string, monitorId: string): Promise<void> => {
  const sentTimestamp = Date.now();
  const req: AcknowledgeNotificationRequest = {
    datasetId: datasetId,
    monitorId: monitorId,
    timestamp: sentTimestamp.toString(),
  };
  try {
    await songbirdClient.notifications.acknowledgeNotification(orgId, runId, req);
  } catch (err) {
    const error = err as SongbirdError;
    if (error.response?.status == 404) {
      logger.warn('Message was not found on the Database, skipping.');
      return;
    } else {
      logger.error('Error acknowledging message with error: %s', error.message);
      throw error;
    }
  }
};

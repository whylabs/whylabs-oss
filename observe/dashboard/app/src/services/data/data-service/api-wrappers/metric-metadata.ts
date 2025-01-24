import { DefaultSchemaMetadata } from '@whylabs/data-service-node-client';

import { getLogger } from '../../../../providers/logger';
import { CallOptions, axiosCallConfig, tryCall } from '../../../../util/async-helpers';
import { dataServiceClient } from '../data-service-client-factory';

const logger = getLogger('DataServiceMetricMetadataLogger');

const MAX_CACHE_AGE_MS = 30 * 1000; // 30 seconds

let cachedDefaultMetadata: DefaultSchemaMetadata | null = null;
let lastCachedTime = 0;

export const getDefaultMetricMetadata = async (_: unknown, options?: CallOptions): Promise<DefaultSchemaMetadata> => {
  if (!cachedDefaultMetadata || Date.now() > lastCachedTime + MAX_CACHE_AGE_MS) {
    logger.info('Fetching default metric metadata');
    const client = options?.context?.dataServiceClient ?? dataServiceClient;
    const response = await tryCall(() => client.entities.getDefaultSchemaMetadata(axiosCallConfig(options)), options);
    lastCachedTime = Date.now();
    cachedDefaultMetadata = response.data;
  }

  return cachedDefaultMetadata;
};

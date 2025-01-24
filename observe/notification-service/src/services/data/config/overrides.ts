import { GetObjectOutput, GetObjectRequest } from '@aws-sdk/client-s3';
import { s3 } from '../../../providers/aws';
import { config } from '../../../config';
import { getLogger } from '../../../providers/logger';
import NodeCache from 'node-cache';

const logger = getLogger('OverrideConfig');
const OVERRIDES_CACHE_KEY = 'overrides';
const OVERRIDES_FILENAME = 'overrides.json';

const cache = new NodeCache({
  useClones: true,
  stdTTL: 300, // 5 minutes
});

export const getOverrideConfig = async (): Promise<OverrideConfig | null> => {
  if (!config.metadataBucketName) {
    return null;
  }
  if (cache.has(OVERRIDES_CACHE_KEY)) {
    const cached = cache.get(OVERRIDES_CACHE_KEY);
    return cached as OverrideConfig;
  }
  const bucket = config.metadataBucketName;
  const params: GetObjectRequest = {
    Bucket: bucket,
    Key: OVERRIDES_FILENAME,
  };
  try {
    logger.info('Loading overrides config from bucket %s key %s.', bucket, OVERRIDES_FILENAME);
    const data: GetObjectOutput = await s3.getObject(params);
    const content = data.Body?.toString();
    const overrides = JSON.parse(content ?? '') as OverrideConfig;
    cache.set(OVERRIDES_CACHE_KEY, overrides);
    return overrides;
  } catch (err) {
    logger.info('No override config found in bucket %s key %s.', bucket, OVERRIDES_FILENAME);
    cache.set(OVERRIDES_CACHE_KEY, { exclude: [] } as OverrideConfig);
    return null;
  }
};

type OverrideConfig = {
  exclude: ExcludeEntry[] | undefined;
};

type ExcludeEntry = {
  orgId: string | undefined;
  datasetId: string | undefined;
  mode: string | undefined;
};

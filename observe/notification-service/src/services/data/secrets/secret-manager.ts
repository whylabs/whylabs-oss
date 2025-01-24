import NodeCache from 'node-cache';
import { secretsManager } from '../../../providers/aws';

const cache = new NodeCache({
  useClones: false,
  stdTTL: 300,
});

export const getSecret = async <T>(secretId: string, typeTest: (t: unknown) => t is T): Promise<T> => {
  if (cache.has(secretId)) {
    const cached = cache.get(secretId);

    if (!typeTest(cached)) {
      throw Error(`Unexpected results while loading secret from cache`);
    }
    return cached;
  }

  const { SecretString } = await secretsManager.getSecretValue({ SecretId: secretId });

  if (!SecretString) {
    throw Error(`Couldn't lookup secret string for ${secretId}`);
  }

  const secret = JSON.parse(SecretString);

  if (!typeTest(secret)) {
    throw Error(`Unexpected results while fetching secret`);
  }

  cache.set(secretId, secret);
  return secret;
};

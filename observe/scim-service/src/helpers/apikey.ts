import { RequestContext } from '../types';
import { errorWithStatusCode } from './errors';

export const getOrgIdFromApiKey = (apiKey: string): string => {
  const colonPos = apiKey.lastIndexOf(':');
  if (colonPos === -1) {
    // no org key
    throw errorWithStatusCode('Invalid API key - no orgId found', 403);
  }
  return apiKey.substring(colonPos + 1);
};

export const getApiKeyFromContext = (context: RequestContext): string | undefined => {
  const authzn = context?.request?.header?.authorization;
  if (!authzn) return undefined;
  const [, apiKey] = authzn.split(' ');
  return apiKey.trim();
};

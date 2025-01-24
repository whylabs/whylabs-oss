import { UserApiKey } from '@whylabs/songbird-node-client';

import { getLogger } from '../../../providers/logger';
import { fnThrow } from '../../../util/misc';
import { AccessTokenMetadata, RequestableTokenScope } from '../../generated/graphql';

const logger = getLogger('TokenConverterLogger');

export const contractToGQLKeyMetadata = (key: UserApiKey): AccessTokenMetadata => ({
  id: key.keyId ?? fnThrow('API keys should always have IDs'),
  userId: key.userId ?? fnThrow('API keys should always have a user ID'),
  name: key.alias ?? 'unknown',
  createdAt: key.creationTime ? new Date(key.creationTime).getTime() : 0,
  expiresAt: key.expirationTime ? new Date(key.expirationTime).getTime() : null,
  scopes: key.scopes ?? [],
  secret: key.key ?? null,
  isRevoked: key.revoked ?? null,
});

export const gqlToTokenScope = (scope: RequestableTokenScope): string | null => {
  switch (scope) {
    case RequestableTokenScope.Admin:
      return ':administrator';
    case RequestableTokenScope.User:
      return ':user';
    case RequestableTokenScope.AccountAdmin:
      return ':account_administrator';
    default:
      logger.error('Found unknown or unrequestable API token scope: %s', scope);
      return null;
  }
};

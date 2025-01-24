import { z } from 'zod';

import { contractToGQLKeyMetadata } from '../../../graphql/contract-converters/songbird/api-key-metadata-converter';
import { AccessTokenMetadata, SortDirection } from '../../../graphql/generated/graphql';
import { getLogger } from '../../../providers/logger';
import { generateApiKey, listApiKeysForOrg, revokeApiKey } from '../../../services/data/songbird/api-wrappers/api-keys';
import { notNullish, sortAsc, sortDesc } from '../../../util/misc';
import { manageOrgProcedure, router } from '../../trpc';
import { callOptionsFromTrpcContext } from '../../util/call-context';
import { createSortBySchema, sortDirectionSchema } from '../../util/schemas';
import { ApiKeysOrderByEnum } from './types/apiKeysTypes';

const logger = getLogger('trpc apiKeys router logger');

const scopeSchema = z.enum(['ACCOUNT_ADMIN', 'ADMIN', 'USER']);
type RequestableTokenScope = z.infer<typeof scopeSchema>;

const convertToTokenScope = (scope: RequestableTokenScope): string | null => {
  switch (scope) {
    case 'ADMIN':
      return ':administrator';
    case 'USER':
      return ':user';
    case 'ACCOUNT_ADMIN':
      return ':account_administrator';
    default:
      logger.error('Found unknown or unrequestable API token scope: %s', scope);
      return null;
  }
};

export const apiKeys = router({
  createApiKey: manageOrgProcedure
    .input(
      z.object({
        expirationTime: z.number().optional(),
        scopes: z.array(z.enum(['ACCOUNT_ADMIN', 'ADMIN', 'USER'])),
        tokenName: z.string(),
      }),
    )
    .mutation(async ({ ctx, input: { expirationTime, orgId, scopes, tokenName } }) => {
      const userId = ctx.userMetadata?.userId;
      if (!userId) return null;

      const allowedScopes = scopes.map(convertToTokenScope).filter(notNullish);

      const response = await generateApiKey(
        orgId,
        userId,
        tokenName,
        expirationTime ?? null,
        allowedScopes,
        callOptionsFromTrpcContext(ctx),
      );
      return response.key;
    }),
  listApiKeys: manageOrgProcedure
    .input(
      z
        .object({
          sortBy: createSortBySchema(ApiKeysOrderByEnum, 'CreationTime'),
        })
        .merge(sortDirectionSchema),
    )
    .query(async ({ ctx, input: { orgId, sortBy, sortDirection } }) => {
      const response = await listApiKeysForOrg(orgId, callOptionsFromTrpcContext(ctx));

      const list: AccessTokenMetadata[] = [];
      response.forEach((data) => {
        // filter out revoked keys
        if (data.revoked) return;

        list.push(contractToGQLKeyMetadata(data));
      });

      list.sort((a, b) => {
        const isAscDirection = sortDirection === SortDirection.Asc;
        const sortFn = isAscDirection ? sortAsc : sortDesc;

        switch (sortBy) {
          case ApiKeysOrderByEnum.Name:
            if (!a.name) return b.name ? 1 : 0;
            if (!b.name) return a.name ? -1 : 0;
            return sortFn(a.name, b.name);

          case ApiKeysOrderByEnum.ExpirationTime:
            if (!a.expiresAt) {
              if (isAscDirection) return b.expiresAt ? 1 : 0;
              return b.expiresAt ? -1 : 0;
            }
            if (!b.expiresAt) {
              if (isAscDirection) return a.expiresAt ? -1 : 0;
              return a.expiresAt ? 1 : 0;
            }
            return sortFn(a.expiresAt, b.expiresAt);

          default:
            if (!a.createdAt) return b.createdAt ? 1 : 0;
            if (!b.createdAt) return a.createdAt ? -1 : 0;
            return sortFn(a.createdAt, b.createdAt);
        }
      });

      return list;
    }),
  revokeApiKey: manageOrgProcedure
    .input(z.object({ keyId: z.string(), userId: z.string() }))
    .mutation(async ({ ctx, input: { keyId, orgId, userId } }) => {
      const response = await revokeApiKey(orgId, userId, keyId, callOptionsFromTrpcContext(ctx));
      return contractToGQLKeyMetadata(response);
    }),
});

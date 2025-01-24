import { IResolvers } from '@graphql-tools/utils';

import { generateApiKey, revokeApiKey } from '../../services/data/songbird/api-wrappers/api-keys';
import { callOptionsFromGraphqlCxt } from '../../util/async-helpers';
import { notNullish } from '../../util/misc';
import { FullGraphQLContext } from '../context';
import { contractToGQLKeyMetadata, gqlToTokenScope } from '../contract-converters/songbird/api-key-metadata-converter';
import { AccessTokenMetadata, Resolvers } from '../generated/graphql';

const resolvers: Resolvers<FullGraphQLContext> = {
  AccessTokenManagement: {
    generate: async (parent, { name, expiresAt, scopes }, context): Promise<AccessTokenMetadata> => {
      // if there's a scope that's not allowed, we'll log and ignore it
      const allowedScopes: string[] | null = scopes?.map(gqlToTokenScope).filter(notNullish) ?? null;
      return contractToGQLKeyMetadata(
        await generateApiKey(
          context.resolveUserOrgID(),
          context.resolveWhyLabsUserId(),
          name,
          expiresAt ?? null,
          allowedScopes,
          callOptionsFromGraphqlCxt(context),
        ),
      );
    },
    revoke: async (parent, { id, userId }, context): Promise<AccessTokenMetadata> =>
      contractToGQLKeyMetadata(
        await revokeApiKey(context.resolveUserOrgID(), userId, id, callOptionsFromGraphqlCxt(context)),
      ),
  },
};

export default resolvers as IResolvers;

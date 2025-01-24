import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import { loadSchemaSync } from '@graphql-tools/load';
import { addResolversToSchema } from '@graphql-tools/schema';
import { IResolvers, pruneSchema } from '@graphql-tools/utils';
import { GraphQLObjectType } from 'graphql/type/definition';
import { difference, equals } from 'ramda';

import { getLogger } from '../providers/logger';
import { findFilesRecursive } from '../util/misc';
import { AUTHORIZATION_DIRECTIVE_NAME, authorizationDirectiveTransformer } from './directives/auth-z';
import accessTokenResolvers from './resolvers/access-token-resolvers';
import dataInvestigatorResolvers from './resolvers/data-investigator-resolvers';
import globalActionResolvers from './resolvers/global-actions-resolvers';
import internalAdminResolvers from './resolvers/internal-admin-resolvers';
import mainResolvers from './resolvers/main-resolvers';
import membershipResolvers from './resolvers/membership-resolvers';
import metricsResolvers from './resolvers/metrics-resolvers';
import modelResolvers from './resolvers/models-resolvers';
import monitorResolvers from './resolvers/monitor-resolvers';
import mutationResolvers from './resolvers/mutation-resolvers';
import organizationResolvers from './resolvers/organization-resolvers';
import profileResolvers from './resolvers/profile-resolvers';
import userResolvers from './resolvers/user-resolvers';

const SCHEMA_PATH = './src/graphql/schemas';

const logger = getLogger('GQLSchemaFactory');

const schemaFiles = findFilesRecursive(logger, SCHEMA_PATH, '.graphql');
logger.info('Loading schemas: %s', schemaFiles.join(','));

const baseResolvers: IResolvers[] = [
  mainResolvers,
  mutationResolvers,
  accessTokenResolvers,
  internalAdminResolvers,
  modelResolvers,
  globalActionResolvers,
  monitorResolvers,
  membershipResolvers,
  organizationResolvers,
  profileResolvers,
  userResolvers,
  metricsResolvers,
  dataInvestigatorResolvers,
];

const resolvers: IResolvers = baseResolvers.reduce((map, resolver) => {
  // ensure additional resolvers do not accidentally overwrite properties from the previous ones
  const resolverTypes = Object.keys(resolver);
  for (const type of resolverTypes) {
    if (map[type])
      throw new Error(
        `Unable to stitch GraphQL schema - resolver for type ${type} is being overwritten! Ensure additional resolvers do not re-declare types already covered in other resolvers. ` +
          `The offending resolver file contains the following types: ${resolverTypes.join(', ')}`,
      );
  }
  return { ...map, ...resolver };
}, {});

// make sure to update `codegen.yml` if messing with custom scalars
const schema = loadSchemaSync(schemaFiles, {
  loaders: [new GraphQLFileLoader()],
});

// some GQL types are used strictly for TypeScript codegen and won't be referenced anywhere in the schema
// some other types are only used in directives and get stripped when pruning
// Possibly we could extract valid __typename's from GQL schema and limit this set to those
const ignoredUnusedTypes = new Set(['DashbirdErrorCode', 'DashbirdError', 'CacheControlScope']);

const prunedSchema = pruneSchema(schema, { skipPruning: (type) => ignoredUnusedTypes.has(type.name) });

// check for unused types in the schema definition (they're tricky to find otherwise)
const originalTypes = Object.keys(schema.getTypeMap());
const prunedTypes = Object.keys(prunedSchema.getTypeMap());
if (!equals(originalTypes, prunedTypes)) {
  const unusedTypes = difference(originalTypes, prunedTypes);
  logger.warn('Detected unused types in the GraphQL schema: %s', unusedTypes.join(','));
}

const schemaWithResolvers = addResolversToSchema({
  schema,
  resolvers,
  inheritResolversFromInterfaces: true,
});

const schemaWithAuthorizationDirective = authorizationDirectiveTransformer(schemaWithResolvers);

// Ensure all top level fields have the @auth directive at the entrypoint field
// This prevents devs from *accidentally* adding queries/mutations that require no auth
const getFieldsWithoutAuth = (objectType?: GraphQLObjectType | null): string[] =>
  objectType?.astNode?.fields
    ?.filter((field) => {
      const authDirective = field.directives?.find(
        (directive) => directive.name.value === AUTHORIZATION_DIRECTIVE_NAME,
      );
      return !authDirective;
    })
    ?.map((node) => node.name.value) ?? [];

const mutationsWithoutAuth = getFieldsWithoutAuth(schemaWithAuthorizationDirective.getMutationType());

const queriesWithoutAuth = getFieldsWithoutAuth(schemaWithAuthorizationDirective.getQueryType());

if (mutationsWithoutAuth.length || queriesWithoutAuth.length)
  throw Error(
    `Top level Mutations and Queries MUST have the @auth directive. ` +
      `Not including this directive can allow unauthorized users to access or modify resources.\n` +
      `The following top-level Mutations did not have the @auth directive: ` +
      `${mutationsWithoutAuth.join(',')}\n` +
      `The following top-level Queries did not have the @auth directive: ` +
      `${queriesWithoutAuth.join(',')}`,
  );

export default schemaWithAuthorizationDirective;

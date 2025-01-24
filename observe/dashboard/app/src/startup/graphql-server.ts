import { ApolloServer, ApolloServerOptions } from '@apollo/server';
import { ExpressContextFunctionArgument, expressMiddleware } from '@apollo/server/express4';
import {
  ApolloServerPluginCacheControlDisabled,
  ApolloServerPluginLandingPageDisabled,
} from '@apollo/server/plugin/disabled';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { json } from 'body-parser';
import cors from 'cors';
import { GraphQLFormattedError } from 'graphql';
import { some } from 'lodash';

import { isDebugMode, isLocalMode, isProdMode } from '../config';
import { IDENTITY_REQUEST_KEY, TARGET_ORG_HEADER_NAME } from '../constants';
import { errorCodeToLogLevel } from '../errors/dashbird-error';
import { tryGetImpersonationContext } from '../graphql/authz/impersonation-context';
import { getUserContext } from '../graphql/authz/user-context';
import { GraphQLContext } from '../graphql/context';
import { DashbirdErrorCode } from '../graphql/generated/graphql';
import schema from '../graphql/schema-factory';
import { getLogger } from '../providers/logger';
import { DataServiceSource } from '../services/data/datasources/data-service-source';
import { EntitySchemaSource } from '../services/data/datasources/entity-schema-source';
import { runTimedActivityAsync, timeout } from '../util/async-helpers';
import { enrichGQLErrorMsg } from '../util/logging';
import { notNullish } from '../util/misc';
import { ApolloDataSources, ContextWithDataSources } from './datasources';
import { getCorsSettings } from './security';
import { DashboardStartupFunc } from './types';

const gqlLogger = getLogger('GraphQLLogger');

// filter out noisy log error(s)
const origErrorMethod = gqlLogger.warn.bind(gqlLogger);
gqlLogger.warn = <T>(obj: T, msg?: string, ...args: unknown[]): void => {
  const skipIfMatches = [/^Could not find node with path .*/];
  const stringToCheck = typeof obj === 'string' ? obj : msg ?? '';
  if (some(skipIfMatches, (matchExpr) => stringToCheck.match(matchExpr))) return;
  origErrorMethod(obj, msg, args);
};

export type DashboardDataSources = {
  schema: EntitySchemaSource;
  featureWeights: EntitySchemaSource;
  dataService: DataServiceSource;
};

export interface DashbirdContext extends ContextWithDataSources, GraphQLContext {}

/**
 * Creates the GraphQL context for the incoming request
 * @param req
 * @param res
 */
export const contextGenerator: (context: ExpressContextFunctionArgument) => Promise<DashbirdContext> = async ({
  req,
  res,
}) => {
  const { operationName } = req?.body ?? {};
  const { id: requestId } = req ?? {};
  const auth0UserId = (req ?? {})[IDENTITY_REQUEST_KEY]?.user?.sub ?? 'unknown';
  const targetOrg = req.header(TARGET_ORG_HEADER_NAME);
  return runTimedActivityAsync(
    gqlLogger,
    'GraphQLContextCreation',
    {
      auth0UserId,
      requestId: String(requestId) ?? undefined,
      operationContext: { name: operationName ?? undefined, orgId: targetOrg },
    },
    () =>
      timeout(
        (async () => {
          const openIDRequest = req;
          const openIDResponse = res;

          // try to use impersonation context (including debug prod mode if enabled)
          const impersonationContext = await tryGetImpersonationContext(openIDRequest, openIDResponse, targetOrg);
          if (impersonationContext) return impersonationContext;

          // otherwise proceed with normal user context creation
          return getUserContext(openIDRequest, openIDResponse, targetOrg);
        })(),
        /**
         * This operation should be extremely fast, because it takes place at the start of EVERY request to the GraphQL server
         * A long delay here is unacceptable and is an indicator of something going horribly wrong somewhere.
         * This means that we need this operation to time out after a relatively short period of time, so that:
         * a) We get logs/alerts when context creation takes too long
         * b) The user can retry whatever they were doing as the issue is likely transient
         */
        30_000, // 30 seconds for now
      ),
  );
};

export const getApolloServerConfig = async (): Promise<ApolloServerOptions<DashbirdContext>> => {
  // apollo sandbox enabled only when running locally or in debug mode - use IDE-based query editors instead for other environments
  const playgroundPlugin =
    isLocalMode() || isDebugMode()
      ? ApolloServerPluginLandingPageLocalDefault({
          embed: { runTelemetry: false, initialState: { pollForSchemaUpdates: false } },
          includeCookies: true,
          headers: {
            'Access-Control-Allow-Origin': 'https://sandbox.embed.apollographql.com',
            'Access-Control-Allow-Credentials': 'true',
          },
        })
      : ApolloServerPluginLandingPageDisabled();
  const dataSources = (): DashboardDataSources => {
    return {
      /*
     Data Sources are NOT safe to share across multiple requests.
     They're instantiated with GraphQL context specific to a request
     and re-using them can result in serious security boundary violations.
     They should be created within the `dataSources` callback here, once per GraphQL request.
     */
      schema: new EntitySchemaSource(),
      featureWeights: new EntitySchemaSource(),
      dataService: new DataServiceSource(),
    };
  };
  return {
    schema,
    logger: gqlLogger,
    formatError: (err: GraphQLFormattedError, error: unknown) => {
      const whylabsGQLError = enrichGQLErrorMsg(err, error);

      const { path } = whylabsGQLError;
      const errorMessage: [GraphQLFormattedError, ...(string | undefined)[]] = [
        whylabsGQLError,
        'Encountered an error while processing a GraphQL request: %s. GraphQL path: %s, Query: %s',
        whylabsGQLError.message,
        path?.join(' > '),
        err.locations?.map((loc) => `Line ${loc.line}, column ${loc.column}`).join('; '),
      ];

      /**
       * We do not want to log all issues as errors here, because they can get very spammy and
       * do not indicate an issue with the service itself.
       */
      const errCode = whylabsGQLError.extensions?.code as DashbirdErrorCode;
      errorCodeToLogLevel(errCode) === 'warn' ? gqlLogger.warn(...errorMessage) : gqlLogger.error(...errorMessage);

      return whylabsGQLError;
    },
    plugins: [
      // Disable Apollo cache, because we do not yet have a centralized caching solution, but do run many instances of Dashbird.
      // In-memory caching does not work well in this scenario, because different nodes may (and do) disagree on the current state.
      ApolloServerPluginCacheControlDisabled(),
      playgroundPlugin, // set up Embedded Apollo Sandbox
      ApolloDataSources({ dataSources }),
    ].filter(notNullish),
    // allow introspection in all dev environments
    introspection: !isProdMode(),
    persistedQueries: false,
  };
};

export const setupGraphQL: DashboardStartupFunc<ApolloServer<DashbirdContext>> = async (
  app,
  logger,
  opts,
): Promise<ApolloServer<DashbirdContext>> => {
  logger.info('Setting up GraphQL');

  const options = await getApolloServerConfig();
  const apolloServer = new ApolloServer<DashbirdContext>(options);

  await apolloServer.start();
  app.use(
    '/graphql',
    cors<cors.CorsRequest>(getCorsSettings(opts)),
    json({
      /**
       * Default request body limit is too low for our Monitor Configs.
       * Set the limit to equal DDB max item size for now and re-evaluate later if needed:
       * https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ServiceQuotas.html
       */
      limit: '400KB',
    }),
    expressMiddleware<DashbirdContext>(apolloServer, {
      context: contextGenerator,
    }),
  );

  return apolloServer;
};

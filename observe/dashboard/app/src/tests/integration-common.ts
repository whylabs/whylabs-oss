import './call-logging-fixtures';
import './interceptors';

import http from 'http';

import { ApolloServer } from '@apollo/server';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import express from 'express';
import { DocumentNode, OperationDefinitionNode, print } from 'graphql';
import { ExecutionResult } from 'graphql/execution/execute';
import fetch from 'node-fetch';

import { serviceUrl } from '../config';
import { TARGET_ORG_HEADER_NAME, WHYLABS_BYPASS_HEADER, WHYLABS_ORG_ID } from '../constants';
import routes from '../controllers/routes';
import { getLogger } from '../providers/logger';
import { getUserByEmail } from '../services/data/songbird/api-wrappers/users';
import { SecretType, retrieveSecretManagerSecret } from '../services/security/secrets';
import { DashbirdContext, setupGraphQL } from '../startup/graphql-server';
import { setupHeaders } from '../startup/headers';
import { setupLogging } from '../startup/logging';
import { setupPerformanceMiddleware } from '../startup/performance';
import { setupSecurity } from '../startup/security';
import { setupSessionMetadata } from '../startup/session';
import { sleepAsync } from '../util/async-helpers';
import { subDaysUTC } from '../util/time';
import { logToAllCallStreams } from './call-logging';
import { getUserAccessToken } from './get-token';

chai.use(chaiAsPromised);
const logger = getLogger('GQLTestLogger');

// async-friendly 'expect'
export const expect = chai.expect;

export const WHYLABS_INTEG_TEST_USER_EMAIL = 'dashbird-int-test@syzygy.ai';
export const LENDING_CLUB_MODEL_ID = 'model-0';
export const LENDING_CLUB_MODEL_NAME = 'lending_club_credit_model';
export const INTEGRATION_TEST_DATASET = 'model-2168'; // a special model in WhyLabs dev for testing
export const POSTGRES_MIGRATION_TEST_ORG = 'org-9snDQm';
export const POSTGRES_MIGRATION_TEST_USER = 'dashbird-int-test@syzygy.ai';
export const POSTGRES_START_TS = 1728950400000; // full day for most datasets 15 Oct 2024
export const POSTGRES_END_TS = 1729468800000; // last full day exclusive 21 Oct 2024

export type StringOrAst = string | DocumentNode;
export type Options<T> = { variables?: T };
export type TestQuery<T, V> = (operation: StringOrAst, opts: Options<V>) => Promise<T>;

// Dashbird Integration Test org
export const DASHBIRD_TEST_ORG = 'org-nJdc5Q';
export const DASHBIRD_TEST_USER_EMAIL = 'dashbird-int-test@syzygy.ai';
export const DIFFERENT_TYPES_DATASET = 'model-1';
export const REGRESSION_MODEL = 'model-2';
export const CLASSIFICATION_MODEL = 'model-3';
export const SEGMENTED_DATASET = 'model-4';
export const SEGMENTED_DATASET_NAME = 'Segmented data';
export const DATA_STREAM_DATASET = 'model-6';
export const LLM_MODEL = 'model-7';
export const TEST_TO_TIMESTAMP = 1663718400000; // 00:00:00 GMT Sep 21, 2022
export const TEST_FROM_PREV_7_DAYS = subDaysUTC(TEST_TO_TIMESTAMP, 7);
export const TEST_FROM_PREV_30_DAYS = subDaysUTC(TEST_TO_TIMESTAMP, 30);

// Additional test orgs
export const INACCESSIBLE_ORG = 'org-1337'; // an org that exists in the current environment, but that the test user cannot access

// headers that we may set on the requests
export type HeaderOptions = {
  [WHYLABS_BYPASS_HEADER]?: string;
  [TARGET_ORG_HEADER_NAME]?: string;
  Authorization?: string;
};
// default headers
const DEFAULT_HEADERS = { 'Content-Type': 'application/json' };

export const setupTestUser = async (
  email = WHYLABS_INTEG_TEST_USER_EMAIL,
  orgId = WHYLABS_ORG_ID,
): Promise<HeaderOptions> => {
  // force the test user to use the correct org
  const whylabsIntegUser = await getUserByEmail(email);
  if (!whylabsIntegUser) {
    throw Error(`Unable to find integ test user ${email} in WhyLabs`);
  }
  // dont set default membership or tests cant run in parallel unless they are different users
  // instead rely on target org ID in header
  // await setDefaultMembership(orgId, whylabsIntegUser.userId);
  await sleepAsync(200); // sanity buffer to let membership settle
  const testSecret = await retrieveSecretManagerSecret(SecretType.Testing);
  if (!testSecret) {
    throw Error('Unable to retrieve test secret');
  }
  const bypassSecret = whylabsIntegUser.email === 'bob@whylabs.ai' ? testSecret.bypassKey : undefined;
  let accessToken: string | undefined = undefined;
  const headerOptions: HeaderOptions = {
    [TARGET_ORG_HEADER_NAME]: orgId,
  };
  if (bypassSecret) {
    headerOptions[WHYLABS_BYPASS_HEADER] = bypassSecret;
  } else {
    const testSecret = await retrieveSecretManagerSecret(SecretType.Testing);
    const auth0Secret = await retrieveSecretManagerSecret(SecretType.Auth0);
    if (!(auth0Secret && testSecret)) {
      throw Error('Could not retrieve testing or auth0 secrets');
    }
    const clientId = auth0Secret.clientId;
    const clientSecret = auth0Secret.clientSecret;
    accessToken = await getUserAccessToken(
      whylabsIntegUser.email,
      testSecret.dashbirdIntTestPassword,
      clientId,
      clientSecret,
    );
    headerOptions.Authorization = `Bearer ${accessToken}`;
  }

  return headerOptions;
};

// fn to make assertions about the results of a query
type GraphQLTestAssertions<TResult> = (response: ExecutionResult<TResult>) => void | Promise<void>;

interface DocumentTypeDecoration<TResult, TVariables> {
  /**
   * This type is used to ensure that the variables you pass in to the query are assignable to Variables
   * and that the Result is assignable to whatever you pass your result to. The method is never actually
   * implemented, but the type is valid because we list it as optional
   */
  __apiType?: (variables: TVariables) => TResult;
}

interface TypedDocumentNode<
  TResult = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  },
  TVariables = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  },
> extends DocumentNode,
    DocumentTypeDecoration<TResult, TVariables> {}

type QueryDocumentWithTargetOrg<TResult, TVars> = TypedDocumentNode<TResult, TVars> & {
  targetOrgId?: string;
};

// will run the supplied query w/ variables (if any), and verify the results using the provided assertions
export type QueryChecker = <TResult extends Record<string, unknown>, TVars>(
  query: QueryDocumentWithTargetOrg<TResult, TVars>,
  variables: TVars | null,
  assertions?: GraphQLTestAssertions<TResult>,
  headerOptions?: HeaderOptions,
) => Promise<void>;

export type QueryCheckerWithResult = <TResult extends Record<string, unknown>, TVars>(
  query: QueryDocumentWithTargetOrg<TResult, TVars>,
  variables: TVars | null,
  assertions?: GraphQLTestAssertions<TResult>,
  headerOptions?: HeaderOptions,
) => Promise<ExecutionResult<TResult>>;

export type TestServer = {
  checkQuery: QueryChecker;
  checkQueryResult: QueryCheckerWithResult;
  serverCleanup: () => Promise<void>;
};

export const setupApolloServer = async (): Promise<TestServer> => {
  let apolloServer: ApolloServer<DashbirdContext> | null = null;
  const app = express();
  const httpServer = http.createServer(app);

  let serverPort: number | null = null;
  await new Promise<void>((resolve, reject) => {
    // specify port 0 to get an arbitrary free port so tests can run in parallel
    const listener = httpServer.listen({ port: 0 }, () => {
      const address = listener.address();
      if (!address || typeof address === 'string') {
        reject(); // unexpected
      } else {
        serverPort = address.port;
      }
      resolve();
    });
  });
  const startupOptions = {
    port: serverPort ?? 0,
    serviceUrl,
    serveFrontEnd: false,
    frontEndUrl: 'http://localhost:3000',
  };
  for (const middleware of [
    setupLogging,
    setupHeaders,
    setupSecurity,
    setupPerformanceMiddleware,
    setupSessionMetadata,
  ]) {
    await middleware(app, logger, startupOptions);
  }
  apolloServer = await setupGraphQL(app, logger, startupOptions);
  routes(app, startupOptions);

  /**
   * Runs the specified query and verifies the results
   * @param query Query/Mutation to run
   * @param variables Any variables if needed
   * @param assertions Function that runs assertions against the results of the query
   * @param headerOptions Additional options (e.g. token, target org) for the request header
   * @return result For additional tests if needed
   */
  const checkQueryResult: QueryCheckerWithResult = async <TResult extends Record<string, unknown>, TVars>(
    query: QueryDocumentWithTargetOrg<TResult, TVars>,
    variables: TVars | null,
    assertions?: GraphQLTestAssertions<TResult>,
    headerOptions?: HeaderOptions,
  ) => {
    const createTestClient = (): TestQuery<TResult, TVars> => {
      return async (operation: StringOrAst, { variables }: Options<TVars> = {}): Promise<TResult> => {
        // operation can be a string or an AST, but `runHttpQuery` only accepts a string
        const queryString = typeof operation === 'string' ? operation : print(operation);
        const optionalOrgIdHeader = query.targetOrgId
          ? {
              [TARGET_ORG_HEADER_NAME]: query.targetOrgId,
            }
          : {};
        const headers = { ...DEFAULT_HEADERS, ...headerOptions, ...optionalOrgIdHeader };
        const res = await fetch(`http://localhost:${serverPort}/graphql`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ query: queryString, variables }),
        });
        if (res.status >= 400) {
          const body = await res.text();
          try {
            return JSON.parse(body);
          } catch {
            throw new Error(`HTTP status ${res.status} from server: ${body}`);
          }
        }
        return res.json();
      };
    };

    const runQuery = createTestClient();

    const operation = query.definitions[0] as OperationDefinitionNode;
    logToAllCallStreams(JSON.stringify({ graphqlQuery: `Starting ${operation.name?.value}` }));
    const result = await runQuery(query, { variables: variables ?? undefined });
    logToAllCallStreams(JSON.stringify({ graphqlQuery: `Finished ${operation.name?.value}` }));

    if (assertions) await assertions(result);
    return result;
  };

  const checkQuery: QueryChecker = async <TResult extends Record<string, unknown>, TVars>(
    query: QueryDocumentWithTargetOrg<TResult, TVars>,
    variables: TVars | null,
    assertions?: GraphQLTestAssertions<TResult>,
    headerOptions = {},
  ) => {
    await checkQueryResult(query, variables, assertions, headerOptions);
    return;
  };

  const serverCleanup = async () => {
    httpServer.close();
    if (apolloServer) {
      await apolloServer.stop();
      apolloServer = null;
    }
  };

  return { checkQuery, checkQueryResult, serverCleanup };
};

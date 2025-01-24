import {
  ApolloClient,
  ApolloLink,
  ApolloProvider,
  createHttpLink,
  InMemoryCache,
  NormalizedCacheObject,
} from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import introspectionResult from 'generated/graphql-possible-types';
import { DEV_BYPASS_HEADER_NAME, TARGET_ORG_HEADER_NAME } from './constants';

// query param used to set org context
// NOTE: this must match Dashbird, Siren, and other services that care about this param
export const TARGET_ORG_QUERY_NAME = 'targetOrgId';

// sets dev bypass header if the env var is present (during local development)
const authLink = setContext((_, { headers }) => {
  const token = process.env.REACT_APP_DEV_BYPASS_KEY;
  if (!token) return { headers };
  // return the headers to the context so httpLink can read them
  return {
    headers: {
      ...headers,
      [DEV_BYPASS_HEADER_NAME]: token,
    },
  };
});

// sets target org header if it's present
const setTargetOrgHeader = (targetOrg?: string) =>
  setContext((_, { headers }) => {
    if (!targetOrg) return { headers };
    return {
      headers: {
        ...headers,
        [TARGET_ORG_HEADER_NAME]: targetOrg,
      },
    };
  });

// Points Apollo to our GraphQL endpoint.
// When running locally (or off CDN in the future) and talking to remote Dashbird, the URL should be absolute and pointing to Dashbird.
// When the UI bundle is served by Dashbird, relative URL is fine.
const getGQLUrl = (): string => {
  return process.env.REACT_APP_DASHBOARD_URL ? `${process.env.REACT_APP_DASHBOARD_URL}/graphql` : '/graphql';
};

const generateGQLLink = (): ApolloLink =>
  createHttpLink({
    uri: getGQLUrl(),
    credentials: process.env.NODE_ENV === 'development' ? 'include' : 'same-origin',
  });

/**
 * Generates an instance of Apollo client to use for the session.
 * @param targetOrgId OrgID that we want to use for outgoing requests.
 */
const getApolloClient = (targetOrgId?: string): ApolloClient<NormalizedCacheObject> =>
  new ApolloClient({
    link: ApolloLink.from([authLink, setTargetOrgHeader(targetOrgId), generateGQLLink()]),
    defaultOptions: {
      /**
       * Disable cache to avoid issues with invalid cache state, caused by some combination of Apollo bugs and/or unstable
       * object UUIDs for many of the entities returned from Dashbird (such as profiles and batches).
       * If re-enabling the cache, see the note about addTypename below.
       */
      watchQuery: { fetchPolicy: 'no-cache' },
      query: { fetchPolicy: 'no-cache' },
      mutate: { fetchPolicy: 'no-cache' },
    },
    cache: new InMemoryCache({
      possibleTypes: introspectionResult.possibleTypes,
      /**
       * By default Apollo client adds typenames to all outgoing queries, even if not specified in the query itself
       * https://www.apollographql.com/docs/react/caching/cache-configuration/
       * This makes it hard to spread the return of a query into the input of a mutation
       * E.g. getUser -> user -> updateUser({...user}) -> ERROR, because __typename is not a valid attribute of a UserInput object
       * Note that typenames are *required* for proper client-side caching:
       * https://www.apollographql.com/docs/react/caching/cache-configuration/#generating-unique-identifiers
       * If caching is ever turned back on, consider re-enabling this after ample testing of mutation behavior
       */
      addTypename: false,
    }),
  });

type WhyApolloProviderProps = {
  readonly children: React.ReactNode;
};

export const WhyApolloProvider = ({ children }: WhyApolloProviderProps): JSX.Element => {
  // We can't use the useLocation() hook here because it causes the component tree to re-render too often with bad undesired side effects
  // Since we are forcing the browser to refresh after the orgId is changed, we can just use window.location.search
  const { search } = window.location;

  const searchParams = new URLSearchParams(search);
  const targetOrg = searchParams.get(TARGET_ORG_QUERY_NAME) ?? undefined;

  return <ApolloProvider client={getApolloClient(targetOrg)}>{children}</ApolloProvider>;
};

WhyApolloProvider.whyDidYouRender = true;

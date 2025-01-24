import { ApolloError } from '@apollo/client';
import { TokensContext, TokensState } from 'TokensContext';
import { UserContext } from 'UserContext';
import { isEqual } from 'lodash';
import { useGetAllAccessTokensLazyQuery } from 'generated/graphql';
import { useContext, useEffect } from 'react';

export function useTokensContext(): { tokensState: TokensState; loading: boolean; error: ApolloError | undefined } {
  const [tokensState, tokensDispatch] = useContext(TokensContext);
  const [userState] = useContext(UserContext);
  if (!tokensDispatch) {
    throw new Error('Cannot use context outside of provider');
  }
  const currentUserEmail = userState?.user?.email;
  const currentOrgId = userState?.user?.organization?.id;

  const [getAccessTokens, { data: tokensData, loading, error: errorAllAccessTokens }] =
    useGetAllAccessTokensLazyQuery();

  useEffect(() => {
    if (!loading && !errorAllAccessTokens && !!currentUserEmail && !!currentOrgId && !tokensData) {
      getAccessTokens();
    }
    if (tokensData?.accessTokens && !isEqual(tokensData.accessTokens, tokensState?.tokens)) {
      tokensDispatch({ method: 'set', tokens: tokensData.accessTokens });
    }
  }, [
    currentUserEmail,
    currentOrgId,
    errorAllAccessTokens,
    tokensDispatch,
    loading,
    tokensState?.tokens,
    tokensData,
    getAccessTokens,
  ]);

  return {
    tokensState,
    loading,
    error: errorAllAccessTokens,
  } as const;
}

import { createContext, useReducer } from 'react';
import { GetAllAccessTokensQuery } from 'generated/graphql';

const STALE_TOKEN_THRESHOLD = 1000 * 60 * 60 * 24 * 30; // Thirty days in milliseconds

export type TokenArray = GetAllAccessTokensQuery['accessTokens'];

export interface TokensState {
  tokens?: TokenArray | null | undefined;
  validTokens?: TokenArray | null | undefined;
  staleTokens?: TokenArray | null | undefined;
}

export function generateTokensState(): TokensState {
  return { tokens: [], validTokens: [], staleTokens: [] };
}

// Set should be used when the entire token array is being replaced.
// Clear should be used when the token array is being cleared.
type TokensActionMethod = 'set' | 'clear';
type TokensAction = {
  method: TokensActionMethod;
  tokens?: TokenArray | null | undefined;
};

const TokensContext = createContext<[TokensState, React.Dispatch<TokensAction>]>([
  generateTokensState(),
  () => {
    /**/
  },
]);

function classifyTokens(tokens: TokenArray): {
  validTokens: TokenArray;
  staleTokens: TokenArray;
} {
  const validTokens: TokenArray = [];
  const staleTokens: TokenArray = [];

  const now = new Date().getTime();
  tokens.forEach((token) => {
    const hasExpirationDate = !!token.expiresAt;
    if (token.isRevoked) {
      return;
    }
    if (!hasExpirationDate || (hasExpirationDate && token.expiresAt! > now)) {
      validTokens.push(token);
      // Inside the first if case because a token must be valid for it to be stale.
      if (hasExpirationDate && token.expiresAt! - now < STALE_TOKEN_THRESHOLD) {
        staleTokens.push(token);
      }
    }
  });
  return { validTokens, staleTokens };
}

export function tokensReducer(state: TokensState, action: TokensAction): TokensState {
  const tokens = action.tokens ?? [];
  const classifiedTokens = classifyTokens(tokens);
  switch (action.method) {
    case 'set':
      return { tokens, ...classifiedTokens };
    case 'clear':
      return generateTokensState();
    default:
      return state;
  }
}

const TokensContextProvider = (props: { children: React.ReactNode }): JSX.Element => {
  const [tokensState, tokensDispatch] = useReducer(tokensReducer, generateTokensState());
  const { children } = props;
  return <TokensContext.Provider value={[tokensState, tokensDispatch]}>{children}</TokensContext.Provider>;
};

export { TokensContext, TokensContextProvider };

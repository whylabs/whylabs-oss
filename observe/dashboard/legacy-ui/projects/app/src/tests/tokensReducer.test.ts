import { TokenArray, generateTokensState, tokensReducer } from 'TokensContext';
import { faker } from '@faker-js/faker';

type TokenFlags = {
  isEternal: boolean;
  isRevoked: boolean;
  isExpired: boolean;
  isStale: boolean;
};
const defaultFlags: TokenFlags = {
  isEternal: false,
  isRevoked: false,
  isExpired: false,
  isStale: false,
};
function generateToken(options: Partial<TokenArray[number]>, flags: TokenFlags = defaultFlags) {
  const { isEternal, isRevoked, isExpired, isStale } = flags;
  const refDate = new Date();
  const staleBoundary = new Date(refDate);
  staleBoundary.setDate(refDate.getDate() + 30);
  const freshDate = new Date(staleBoundary);
  freshDate.setDate(staleBoundary.getDate() + faker.number.int({ min: 2, max: 100 }));
  const futureDate = isStale
    ? faker.date.soon({ days: 29, refDate })
    : faker.date.between({ from: staleBoundary, to: freshDate });
  const expiresAtTimestamp = isExpired ? faker.date.past().getTime() : futureDate.getTime();
  const token = {
    name: faker.string.alpha({ length: { min: 5, max: 10 } }),
    id: faker.string.uuid(),
    userId: faker.internet.email(),
    createdAt: faker.date.past().getTime(),
    expiresAt: isEternal ? null : expiresAtTimestamp,
    scopes: ['read:datasets', 'write:datasets'],
    isRevoked: !!isRevoked,
  };
  return { ...token, ...options };
}

describe('Tests for updating the global tokens state', () => {
  it('should add a list of tokens to the global state', () => {
    const tokens: TokenArray = [];
    Array.from({ length: 10 }).forEach(() => {
      tokens.push(generateToken({}));
    });
    const state = tokensReducer(generateTokensState(), { method: 'set', tokens });
    expect(state.tokens?.length).toEqual(10);
    expect(state.validTokens?.length).toEqual(10);
    expect(state.staleTokens?.length).toEqual(0);
  });

  it('should be able to clear the global state', () => {
    const tokens: TokenArray = [];
    Array.from({ length: 5 }).forEach(() => {
      tokens.push(generateToken({}));
    });
    const state = tokensReducer(generateTokensState(), { method: 'set', tokens });
    const clearedState = tokensReducer(state, { method: 'clear' });
    expect(clearedState.tokens?.length).toEqual(0);
  });

  it('should classify stale tokens', () => {
    const tokens: TokenArray = [];
    Array.from({ length: 5 }).forEach((_, idx) => {
      const isStale = idx % 2 === 0;
      tokens.push(generateToken({}, { ...defaultFlags, isStale }));
    });
    const state = tokensReducer(generateTokensState(), { method: 'set', tokens });
    expect(state.tokens?.length).toEqual(5);
    expect(state.validTokens?.length).toEqual(5);
    expect(state.staleTokens?.length).toEqual(3);
  });

  it('should not classify expired tokens as stale', () => {
    const tokens: TokenArray = [];
    Array.from({ length: 5 }).forEach((_, idx) => {
      const isStale = idx % 2 === 0;
      const isExpired = idx === 1;
      tokens.push(generateToken({}, { ...defaultFlags, isExpired, isStale }));
    });
    const state = tokensReducer(generateTokensState(), { method: 'set', tokens });
    expect(state.tokens?.length).toEqual(5);
    expect(state.validTokens?.length).toEqual(4);
    expect(state.staleTokens?.length).toEqual(3);
  });

  it('should classify eternal tokens as valid and not stale', () => {
    const tokens: TokenArray = [];
    Array.from({ length: 10 }).forEach((_, idx) => {
      const isEternal = idx % 2 === 0;
      // This forces all of the tokens to be stale, but then overrides some of them
      // as eternal.
      tokens.push(generateToken({}, { ...defaultFlags, isEternal, isStale: true }));
    });
    const state = tokensReducer(generateTokensState(), { method: 'set', tokens });
    expect(state.tokens?.length).toEqual(10);
    expect(state.validTokens?.length).toEqual(10);
    expect(state.staleTokens?.length).toEqual(5);
  });

  it('should not classify revoked tokens as valid', () => {
    const tokens: TokenArray = [];
    Array.from({ length: 5 }).forEach((_, idx) => {
      const isRevoked = idx % 2 === 0;
      tokens.push(generateToken({}, { ...defaultFlags, isRevoked }));
    });
    const state = tokensReducer(generateTokensState(), { method: 'set', tokens });
    expect(state.tokens?.length).toEqual(5);
    expect(state.validTokens?.length).toEqual(2);
  });
});

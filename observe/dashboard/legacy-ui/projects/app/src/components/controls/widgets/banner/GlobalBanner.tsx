import { useTokensContext } from 'hooks/useTokensContext';
import { StaleTokensBanner } from './StaleTokensBanner';

export function GlobalBanner(): JSX.Element | null {
  const { tokensState } = useTokensContext();
  const staleTokenCount = tokensState?.staleTokens?.length ?? 0;
  if (staleTokenCount > 0) {
    return <StaleTokensBanner tokenCount={staleTokenCount} />;
  }
  return null;
}

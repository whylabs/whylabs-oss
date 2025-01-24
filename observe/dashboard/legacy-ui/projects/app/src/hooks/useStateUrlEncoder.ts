import { getParam } from 'pages/page-types/usePageType';
import { JSONObject } from 'types/genericTypes';
import { isCardDecorationType, WhyCardDecorationType } from 'components/cards/why-card/WhyCardTexts';
import { CardType, isCardType } from 'components/cards/why-card/types';
import { useCallback } from 'react';

type StateUrlEncoderReturnType = {
  encodeState: (state: JSONObject) => string;
  decodeState: (stateUrlKey: string) => JSONObject | null;
  getAnalysisState: (stateUrlKey: string) => EncodedAnalysisInfo | null;
};

export type EncodedAnalysisInfo = {
  graphDecorationType: WhyCardDecorationType;
  analyzerId: string;
  scrollToCard?: CardType;
};
export const useStateUrlEncoder = (): StateUrlEncoderReturnType => {
  const encodeState = (state: JSONObject) => btoa(JSON.stringify(state));
  const decodeState = (stateUrlKey: string): JSONObject | null => {
    const stateString = getParam(stateUrlKey);
    if (!stateString) return null;
    const parsedState = JSON.parse(atob(stateString));
    if (typeof parsedState === 'object') return parsedState;
    return null;
  };

  const getAnalysisState = useCallback((stateUrlKey: string): EncodedAnalysisInfo | null => {
    const state = decodeState(stateUrlKey);
    if (!state) return null;
    const { analyzerId, graphDecorationType, scrollToCard } = state;
    const decoration = isCardDecorationType(graphDecorationType) ? graphDecorationType : undefined;
    if (typeof analyzerId === 'string' && decoration) {
      const cardType = isCardType(scrollToCard) ? scrollToCard : undefined;
      return {
        analyzerId,
        graphDecorationType: decoration,
        scrollToCard: cardType,
      };
    }
    return null;
  }, []);

  return { encodeState, decodeState, getAnalysisState };
};

import { createContext, useReducer } from 'react';
import { HtmlTooltipProps } from '@whylabs/observatory-lib';
import { AnalysisDataFragment, BaselineFieldsFragment } from 'generated/graphql';
import { CategoryKeys } from 'strings/types';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { WhyCardDecorationType, WhyCardTexts } from './WhyCardTexts';
import { CardType } from './types';

export type WhyCardDecoration = {
  readonly title: string;
} & HtmlTooltipProps;

export function getWhyCardDecoration(type: WhyCardDecorationType, category: CategoryKeys): WhyCardDecoration {
  return WhyCardTexts[type](category);
}

export interface WhyCardState {
  readonly cardType: CardType;
  readonly decorationType: WhyCardDecorationType;
  readonly resourceId: string;
  showDefault: boolean;
  findAlerts: (cardType: CardType, timeStamp: number) => void;
  analysisResults: AnalysisDataFragment[];
  isDiscrete: boolean;
  analyzer: string;
  monitorId?: string;
  baseline: BaselineFieldsFragment | null;
  showingNoData?: boolean;
  cardWidth: number;
}

function generateEmptyState(
  resourceId: string,
  findFunction?: (cardType: CardType, timeStamp: number) => void,
  cardType?: CardType,
): WhyCardState {
  const findAlerts =
    findFunction ||
    (() => {
      /**/
    });
  const nonEmptyCardType = cardType || 'uniqueValues';
  return {
    resourceId,
    decorationType: 'unknown',
    findAlerts,
    cardType: nonEmptyCardType,
    showDefault: true,
    analysisResults: [],
    isDiscrete: false,
    analyzer: '',
    baseline: null,
    showingNoData: false,
    cardWidth: 0,
  };
}

export const WhyCardContext = createContext<[WhyCardState, React.Dispatch<Partial<WhyCardState>>]>([
  generateEmptyState(''),
  () => {
    /**/
  },
]);

function cardStateReducer(state: WhyCardState, action: Partial<WhyCardState>) {
  return { ...state, ...action };
}

export const WhyCardContextProvider = (props: {
  children: React.ReactNode;
  cardType: CardType;
  findAlerts?: (cardType: CardType, timeStamp: number) => void;
}): JSX.Element => {
  const { children, cardType, findAlerts } = props;
  const { modelId } = usePageTypeWithParams();

  const initialState = generateEmptyState(modelId, findAlerts, cardType);
  const [cardState, cardDispatch] = useReducer(cardStateReducer, initialState);

  return <WhyCardContext.Provider value={[cardState, cardDispatch]}>{children}</WhyCardContext.Provider>;
};

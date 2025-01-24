import { createContext, useCallback, useReducer } from 'react';
import { DatedData } from 'types/graphTypes';

export interface CardDataState {
  discreteData: DatedData[];
  continuousData: DatedData[];
  showDiscrete: boolean;
  selectedIndex: number | null;
  selectedProfile: number | null;
  hasNext: boolean;
  hasPrevious: boolean;
  comparisonGraphOpened: boolean;
  comparisonGraphWidth: number;
}

export const generateEmptyCardDataState = (): CardDataState => ({
  discreteData: [],
  continuousData: [],
  showDiscrete: false,
  selectedIndex: null,
  selectedProfile: null,
  hasNext: false,
  hasPrevious: false,
  comparisonGraphOpened: false,
  comparisonGraphWidth: 0,
});

function cardDataReducer(state: CardDataState, action: Partial<CardDataState>) {
  return { ...state, ...action };
}

interface CardDataContextContents {
  readonly cardDataState: CardDataState;
  setData: (data: DatedData[], isDiscrete: boolean) => void;
  setShowDiscrete: (showDiscrete: boolean) => void;
  goToNext: () => void;
  goToPrevious: () => void;
  goToIndex: (index: number | null) => void;
  moveBy: (delta: number) => void;
  setOpened: (o: boolean) => void;
  setComparisonGraphWidth: (w: number) => void;
}

function generateEmptyCardDataContextContents(): CardDataContextContents {
  return {
    cardDataState: generateEmptyCardDataState(),
    setData: () => {
      /**/
    },
    setShowDiscrete: () => {
      /**/
    },
    goToNext: () => {
      /**/
    },
    goToPrevious: () => {
      /**/
    },
    goToIndex: () => {
      /**/
    },
    moveBy: () => {
      /**/
    },
    setOpened: () => {
      /**/
    },
    setComparisonGraphWidth: () => {
      /**/
    },
  };
}

export const CardDataContext = createContext<CardDataContextContents>(generateEmptyCardDataContextContents());

export const CardDataContextProvider = (props: { children: React.ReactNode }): JSX.Element => {
  const initialState = generateEmptyCardDataState();
  const { children } = props;
  const [cardDataState, cardDataDispatch] = useReducer(cardDataReducer, initialState);

  const updateSelectedIndex = useCallback(
    (index: number | null) => {
      const data = cardDataState.showDiscrete ? cardDataState.discreteData : cardDataState.continuousData;
      if (index === null || index < 0 || index >= data.length) {
        cardDataDispatch({
          selectedIndex: null,
          selectedProfile: null,
          hasNext: false,
          hasPrevious: false,
          comparisonGraphOpened: false,
        });
      } else {
        const selectedProfile = data[index].dateInMillis;
        const hasNext = index < data.length - 1;
        const hasPrevious = index > 0;
        cardDataDispatch({ selectedIndex: index, selectedProfile, hasNext, hasPrevious, comparisonGraphOpened: true });
      }
    },
    [cardDataState.showDiscrete, cardDataState.discreteData, cardDataState.continuousData, cardDataDispatch],
  );

  const setData = useCallback(
    (data: DatedData[], isDiscrete: boolean) => {
      if (isDiscrete) {
        cardDataDispatch({ discreteData: data });
      } else {
        cardDataDispatch({ continuousData: data });
      }
    },
    [cardDataDispatch],
  );

  const setShowDiscrete = useCallback(
    (showDiscrete: boolean) => {
      if (showDiscrete !== cardDataState.showDiscrete) {
        updateSelectedIndex(null);
      }
      cardDataDispatch({ showDiscrete });
    },
    [cardDataState.showDiscrete, updateSelectedIndex],
  );

  const goToNext = useCallback(() => {
    if (cardDataState.hasNext && cardDataState.selectedIndex !== null) {
      updateSelectedIndex(cardDataState.selectedIndex + 1);
    }
  }, [cardDataState.hasNext, cardDataState.selectedIndex, updateSelectedIndex]);

  const goToPrevious = useCallback(() => {
    if (cardDataState.hasPrevious && cardDataState.selectedIndex !== null) {
      updateSelectedIndex(cardDataState.selectedIndex - 1);
    }
  }, [cardDataState.hasPrevious, cardDataState.selectedIndex, updateSelectedIndex]);

  const goToIndex = useCallback(
    (index: number | null) => {
      updateSelectedIndex(index);
    },
    [updateSelectedIndex],
  );

  const setOpened = useCallback((open: boolean) => {
    cardDataDispatch({ comparisonGraphOpened: open });
  }, []);

  const setComparisonGraphWidth = (width: number) => {
    cardDataDispatch({ comparisonGraphWidth: width });
  };

  const moveBy = useCallback(
    (delta: number) => {
      if (cardDataState.selectedIndex !== null) {
        goToIndex(cardDataState.selectedIndex + delta);
      }
    },
    [cardDataState.selectedIndex, goToIndex],
  );

  return (
    <CardDataContext.Provider
      value={{
        cardDataState,
        goToNext,
        goToPrevious,
        goToIndex,
        moveBy,
        setData,
        setShowDiscrete,
        setOpened,
        setComparisonGraphWidth,
      }}
    >
      {children}
    </CardDataContext.Provider>
  );
};

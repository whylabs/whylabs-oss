import { useRecoilState } from 'recoil';
import { getSummaryCardsAtom } from 'atoms/summaryCardsAtom';
import { CustomCard, CustomCardComponent } from './SummaryCard';
import { useModelSummaryTabContentCSS, NUMBER_OF_COLUMNS } from './useModelSummaryCSS';
import SummaryColumn from './SummaryColumn';
import { useResourceText } from '../hooks/useResourceText';

const FILE_TEXTS = {
  DATA: {},
  MODEL: {},
  LLM: {},
};

const LAST_COL_INDEX = NUMBER_OF_COLUMNS - 1;
const COLUMN_INDEX_ARR: string[] = [];
for (let i = 0; i < NUMBER_OF_COLUMNS; i += 1) {
  COLUMN_INDEX_ARR.push(`column-component-${i}`);
}

export default function ModelSummaryColumns({
  allCustomCards,
  omitCards,
  columnsWrapCurrent,
}: {
  allCustomCards: CustomCardComponent[];
  omitCards: string[];
  columnsWrapCurrent: HTMLDivElement | null;
}): JSX.Element {
  const { category, isDataTransform } = useResourceText(FILE_TEXTS);

  const { classes: styles } = useModelSummaryTabContentCSS();
  const cardAtom = getSummaryCardsAtom(category, isDataTransform);
  const [cards, setCards] = useRecoilState<CustomCard[]>(cardAtom);

  const showCard = (id: string) => {
    const newCards = cards.map((card) => (card.id === id ? { ...card, show: true } : card));
    setCards(newCards);
  };

  const hideCard = (id: string) => {
    const cardToHide = cards.find((card) => card.id === id);
    if (!cardToHide) return;
    const cardsWithoutHidden = [...cards].filter((card) => card.id !== id);
    const shrinkingColumn = cardsWithoutHidden
      .filter((card) => card.column === cardToHide?.column)
      .sort((c1, c2) => c1.order - c2.order)
      .map((card, cardIndex) => ({ ...card, order: cardIndex }));
    const newCards = cardsWithoutHidden.map(
      (card) => shrinkingColumn.find((colCard) => colCard.id === card.id) || card,
    );
    const cardToHideUpdate = { ...cardToHide, show: false };
    newCards.push(cardToHideUpdate);
    setCards(newCards);
  };

  return (
    <div className={styles.columns}>
      {COLUMN_INDEX_ARR.map((colKey, colIndex) => (
        <SummaryColumn
          key={colKey}
          columnIndex={colIndex}
          lastIndex={LAST_COL_INDEX}
          cards={cards.filter((card) => !omitCards.includes(card.id))}
          allCustomCards={allCustomCards}
          columnsWrapCurrent={columnsWrapCurrent}
          hideCard={hideCard}
          showCard={showCard}
        />
      ))}
    </div>
  );
}

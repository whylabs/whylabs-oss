import { CustomCard, CustomCardComponent } from './SummaryCard';
import { useModelSummaryTabContentCSS } from './useModelSummaryCSS';
import AddSummaryCard from './AddSummaryCard';

interface SummaryColumnProps {
  columnIndex: number;
  lastIndex: number;
  cards: CustomCard[];
  allCustomCards: CustomCardComponent[];
  columnsWrapCurrent: HTMLDivElement | null;
  hideCard: ((id: string) => void) | (() => void);
  showCard: ((id: string) => void) | (() => void);
}

export default function SummaryColumn({
  columnIndex,
  lastIndex,
  cards,
  allCustomCards,
  columnsWrapCurrent,
  hideCard,
  showCard,
}: SummaryColumnProps): JSX.Element {
  const { classes: styles } = useModelSummaryTabContentCSS();
  const renderCardsForColumn = (colIndex: number) =>
    cards
      .filter((card) => card.column === colIndex)
      .sort((c1, c2) => c1.order - c2.order)
      .map((card) => {
        const CurrentCustomCard = allCustomCards.find((customCard) => customCard.id === card.id);
        if (!card.show || !CurrentCustomCard) return null;
        return (
          <CurrentCustomCard.Component
            customCard={{ ...card, hideCard, columnsWrapCurrent }}
            key={`custom-card-${card.id}`}
          />
        );
      });

  return (
    <div className={styles.column}>
      {renderCardsForColumn(columnIndex)}
      {columnIndex === lastIndex && <AddSummaryCard cards={cards} showCard={showCard} />}
    </div>
  );
}

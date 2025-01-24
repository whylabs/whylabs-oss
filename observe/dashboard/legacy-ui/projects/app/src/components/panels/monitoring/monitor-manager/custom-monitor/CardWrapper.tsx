import { Dispatch, SetStateAction, useState } from 'react';
import { PhaseCard } from './phase-cards/phaseCard';
import useCustomMonitorManagerCSS, { cardBorderWidth, cardPadding, minRowHeight } from './useCustomMonitorManagerCSS';

const CardWrapper = ({
  phaseIndex,
  activePhaseIndex,
  isFirstCardInRow = false,
  isLastCardInRow,
  cardComponent,
  btnComponent,
  editMode,
  setHasChanged,
}: {
  phaseIndex: number;
  activePhaseIndex: number[];
  isFirstCardInRow?: boolean;
  isLastCardInRow: boolean;
  cardComponent: PhaseCard;
  btnComponent?: JSX.Element;
  editMode: boolean;
  setHasChanged: Dispatch<SetStateAction<boolean>>;
}): JSX.Element | null => {
  const { classes: styles, cx } = useCustomMonitorManagerCSS();
  const [clientHeight, setClientHeight] = useState(0);
  const { content: CardComponent, span } = cardComponent;
  const [widthSpan, setWidthSpan] = useState<number>(span);

  const isPhaseActive = editMode ? activePhaseIndex.includes(phaseIndex) : activePhaseIndex[0] === phaseIndex;
  const isPhaseInactive = activePhaseIndex[0] < phaseIndex;

  const columnCardActiveHeight = clientHeight + 2 * (cardPadding + cardBorderWidth);
  const columnCardHeight = isPhaseActive ? columnCardActiveHeight : minRowHeight;

  return (
    <div
      className={cx(styles.columnCardWrap, isPhaseInactive && !editMode && styles.columnCardWrapInactive)}
      style={{ gridColumn: `span ${widthSpan}` }}
    >
      <div
        className={cx(
          styles.columnCard,
          isFirstCardInRow && styles.columnCardFirst,
          isLastCardInRow && styles.columnCardLast,
        )}
        style={{ minHeight: columnCardHeight }}
      >
        <CardComponent
          setContentHeight={setClientHeight}
          isPhaseActive={isPhaseActive}
          editMode={editMode}
          setHasChanged={setHasChanged}
          setWidthSpan={setWidthSpan}
        />
      </div>
      {isPhaseActive && !editMode && <div className={styles.columnCardBtnSpacer}>{btnComponent}</div>}
    </div>
  );
};
export default CardWrapper;

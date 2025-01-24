import { Card, DynamicColor } from 'generated/dashboard-schema';
import grid from 'ui/default-exec-layout.json';
import dataGrid from 'ui/default-exec-data-layout.json';
import { createStyles } from '@mantine/core';
import { DashCard } from './DashCard';
import { asCardType, asDynamicColor } from './helpers/typeHelpers';
import { GRID_COLUMN_WIDTH_PX, GRID_GAP_PX, GRID_PADDING_PX, useExecutiveDashTab } from './utils';
import { getClickableIndexCount } from './helpers/cardReducers';

const useExecPanelStyles = createStyles({
  root: {
    display: 'flex',
    flexDirection: 'row',
    height: 'fit-content',
    gap: `${GRID_GAP_PX}px`,
    padding: `${GRID_PADDING_PX}px`,
    background: 'white',
    width: '100%',
  },
  squareColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: `${GRID_GAP_PX}px`,
    width: `${GRID_COLUMN_WIDTH_PX}px`,
    flexShrink: 0,
  },
  narrowColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: `${GRID_GAP_PX}px`,
    width: `${2 * GRID_COLUMN_WIDTH_PX + GRID_GAP_PX}px`,
    flexShrink: 0,
  },
  graphColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: `${GRID_GAP_PX}px`,
    minWidth: `${3 * GRID_COLUMN_WIDTH_PX + 2 * GRID_GAP_PX}px`,
    flexGrow: 1,
  },
});

/**
 * TODO: make this a rigorous parser. Casting / parsing needed for now
 * because the enum values are not automatically translated simply by
 * React import.
 */
function parseConfiguration(config: unknown[]): Card[] {
  const parsed: Card[] = [];
  config.forEach((ob) => {
    const card = asCardType(ob);
    if (card !== null) {
      parsed.push(card);
    }
  });
  return parsed;
}

function parseColors(config: unknown[]): DynamicColor[] {
  const parsed: DynamicColor[] = [];
  config.forEach((ob) => {
    const dc = asDynamicColor(ob);
    if (dc !== null) {
      parsed.push(dc);
    }
  });
  return parsed;
}

export const ExecutiveDashboardPanel: React.FC = () => {
  const selectedTab = useExecutiveDashTab();
  const modelCards = parseConfiguration(grid.contents);
  const modelDynamicColors = parseColors(grid.dynamicColors);
  const dataCards = parseConfiguration(dataGrid.contents);
  const dataDynamicColors = parseColors(dataGrid.dynamicColors);

  const [usedCards, usedDynamicColors] =
    selectedTab.label === 'Model Summary' ? [modelCards, modelDynamicColors] : [dataCards, dataDynamicColors];

  const { classes: styles } = useExecPanelStyles();

  const renderCardArray = (cards: Card[], dynamicColors: DynamicColor[], columnTitle: string) => {
    let clickIndexTotal = 0;
    return cards.map((card) => {
      const clickableSubItems = getClickableIndexCount(card);
      clickIndexTotal += clickableSubItems;

      return (
        <DashCard
          cardInfo={card}
          key={`${columnTitle}-col-card-${card.title.text ?? 'untitled'}`}
          dynamicColors={dynamicColors}
          tabStartIndex={clickableSubItems ? clickIndexTotal : undefined}
        />
      );
    });
  };

  const renderFakeGrid = () => {
    const squareCards: Card[] = [];
    const narrowCards: Card[] = [];
    const graphCards: Card[] = [];
    usedCards.forEach((card) => {
      switch (card.gridArea) {
        case 1:
          squareCards.push(card);
          break;
        case 2:
          narrowCards.push(card);
          break;
        case 3:
          graphCards.push(card);
          break;
        default:
          // Without a column, the card is not displayed.
          break;
      }
    });
    return (
      <div className={styles.root}>
        <div className={styles.squareColumn}>{renderCardArray(squareCards, usedDynamicColors, 'square')}</div>
        <div className={styles.narrowColumn}>{renderCardArray(narrowCards, usedDynamicColors, 'narrow')}</div>
        <div className={styles.graphColumn}>{renderCardArray(graphCards, usedDynamicColors, 'graph')}</div>
      </div>
    );
  };

  return renderFakeGrid();
};

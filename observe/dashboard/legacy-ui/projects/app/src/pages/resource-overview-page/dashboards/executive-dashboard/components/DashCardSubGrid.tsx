import { DynamicColor, SubGrid } from 'generated/dashboard-schema';
import { createStyles } from '@mantine/core';
import { isExactlyNullOrUndefined } from 'utils';
import { MiniDashCard } from './MiniDashCard';
import { ToggleOnClickAction, ToggleOnClickState } from '../helpers/cardReducers';

interface StylesProps {
  subRows?: number;
  subColumns?: number;
}

const NW_AREA = 'nw';
const NE_AREA = 'ne';
const SW_AREA = 'sw';
const SE_AREA = 'se';
const QUAD_AREAS = [NW_AREA, NE_AREA, SW_AREA, SE_AREA];
type QuadArea = typeof QUAD_AREAS[number];
const useStyles = createStyles((_, { subRows, subColumns }: StylesProps) => ({
  blockContainer: {
    flexGrow: 1,
  },
  subGridContainer: {
    display: 'grid',
    gridTemplateColumns: `repeat(${subColumns || 1}, 1fr)`,
    gridTemplateRows: `repeat(${subRows || 1}, 1fr)`,
    alignSelf: 'flex-end',
  },
  quadrantContainer: {
    gridTemplateAreas: `
      '${NW_AREA} ${NE_AREA}'
      'sw se'
    `,
  },
  stretchContainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: '20px',
  },
}));

const DEFAULT_SQUARE_SIZE = 2;
const THREE_GRID_AREAS: QuadArea[] = [NW_AREA, NE_AREA, SE_AREA];
const TWO_GRID_AREAS: QuadArea[] = [NE_AREA, SE_AREA];
const SINGULAR_GRID_AREA: QuadArea[] = [NE_AREA];
const QUAD_AREAS_BY_INDEX = [SINGULAR_GRID_AREA, TWO_GRID_AREAS, THREE_GRID_AREAS];

interface SubGridProps {
  subGrid?: SubGrid;
  gridArea?: number;
  fieldValues?: {
    [key: string]: number;
  } | null;
  clickAction: React.Dispatch<ToggleOnClickAction> | null;
  clickState: ToggleOnClickState | null;
  tabStartIndex?: number;
  dynamicColors: DynamicColor[];
  loading: boolean;
}

function getSquareSideByCount(count: number): number {
  if (count < DEFAULT_SQUARE_SIZE * DEFAULT_SQUARE_SIZE) {
    return DEFAULT_SQUARE_SIZE;
  }
  return Math.ceil(Math.sqrt(count));
}

function getQuadArrayByCount(count: number): QuadArea[] {
  if (count > 0 && count < 4) {
    return QUAD_AREAS_BY_INDEX[count - 1];
  }
  return [];
}

export const DashCardSubGrid: React.FC<SubGridProps> = ({
  subGrid,
  fieldValues,
  gridArea,
  clickAction,
  clickState,
  tabStartIndex,
  dynamicColors,
  loading,
}) => {
  const items = subGrid?.contents.length ?? 0;
  const { classes, cx } = useStyles({
    subRows: getSquareSideByCount(items),
    subColumns: getSquareSideByCount(items),
  });

  const areaNames = getQuadArrayByCount(items);
  return (
    <div className={classes.blockContainer}>
      <div
        className={cx(
          gridArea === 3 ? classes.stretchContainer : classes.subGridContainer,
          gridArea !== 3 && items < 4 && classes.quadrantContainer,
        )}
      >
        {subGrid?.contents?.map((miniCard, index) => {
          const itemValue = fieldValues ? fieldValues[miniCard.fieldId ?? 'none'] : null;
          if (isExactlyNullOrUndefined(itemValue)) {
            return null;
          }
          return (
            <MiniDashCard
              cardInfo={miniCard}
              value={itemValue}
              precision={miniCard.heroProperties?.valueAttributes?.precision}
              valueType={miniCard.heroProperties?.valueAttributes?.valueType}
              key={miniCard.title.text ?? 'untitled-minicard'}
              clickAction={clickAction}
              clickState={clickState}
              tabIndex={index + (tabStartIndex ?? 0)}
              cardArea={areaNames.length > index ? areaNames[index] : undefined}
              dynamicColors={dynamicColors}
              loading={loading}
            />
          );
        })}
      </div>
    </div>
  );
};

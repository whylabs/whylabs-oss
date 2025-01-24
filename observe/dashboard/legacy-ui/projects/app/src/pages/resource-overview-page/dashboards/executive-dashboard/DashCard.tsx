import { Colors } from '@whylabs/observatory-lib';
import { createStyles } from '@mantine/core';
import { Card, DynamicColor } from 'generated/dashboard-schema';
import useResizeObserver from 'use-resize-observer';
import { getFormattedDateRangeString } from 'utils/dateUtils';
import { WhyLabsText } from 'components/design-system';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';
import { useGetQueryByIds } from './hooks/useGetQueryByIds';
import { determineColors, getColumnFromGridArea } from './helpers/cardHelpers';
import { CardHero } from './components/CardHero';
import { DashCardSubGrid } from './components/DashCardSubGrid';
import { DashCardGraph } from './components/DashCardGraph';
import { GRID_COLUMN_WIDTH_PX, GRID_GAP_PX, GRID_ROW_HEIGHT_PX } from './utils';
import { useCardInfoClickReducer } from './helpers/cardReducers';

interface StylesProps {
  backgroundColor: string;
  color: string;
  hasBorder: boolean;
  columnStart?: number;
  rowSpan: number;
  columnSpan: number;
  stretch: boolean;
}

const useStyles = createStyles(
  (_, { backgroundColor, color, hasBorder, rowSpan, columnSpan, columnStart, stretch }: StylesProps) => ({
    styledCard: {
      backgroundColor,
      color,
      border: `2px solid ${hasBorder ? color : Colors.brandSecondary200}`,
      borderRadius: '4px',
      minHeight: `${rowSpan * GRID_ROW_HEIGHT_PX + (rowSpan - 1) * GRID_GAP_PX}px`,
      height: `${rowSpan * GRID_ROW_HEIGHT_PX + (rowSpan - 1) * GRID_GAP_PX}px`,
      width: '100%',
      display: 'flex',
      justifyContent: 'space-between',
      alignContent: 'stretch',
      padding: '15px 15px 0 15px',
    },
    blockContainer: {
      flexGrow: 1,
    },
    stackContainer: {
      display: 'flex',
      flexDirection: 'column',
      height: '76px',
      justifyContent: 'space-between',
    },
    stretchContainer: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    verticalCard: {
      flexDirection: 'column',
    },
    horizontalCard: {
      flexDirection: 'row',
    },
    titleContainer: {
      marginBottom: '10px',
    },
    titleText: {
      fontFamily: 'Asap',
      fontSize: '14px',
      lineHeight: 1.4,
      fontWeight: 600,
      color: Colors.brandSecondary900,
    },
    infoText: {
      fontFamily: 'Asap',
      fontSize: '14px',
      lineHeight: 1,
      textAlign: 'end',
      color: Colors.brandSecondary900,
    },
    graphWrapper: {
      marginTop: '18px',
    },
  }),
);

interface DashCardProps {
  cardInfo: Card;
  dynamicColors: DynamicColor[];
  sharedColumn?: boolean;
  tabStartIndex?: number;
}

export const DashCard: React.FC<DashCardProps> = ({ cardInfo, dynamicColors, sharedColumn = false, tabStartIndex }) => {
  const primaryId = cardInfo.queryId ?? 'none';
  const fieldIds = cardInfo.subGrid?.contents?.map((mini) => mini.fieldId ?? 'none') ?? [];
  const useDataHook = useGetQueryByIds(primaryId);
  const { value, altValue, fieldValues, timeSeriesFieldValues, timeSeriesValues, loading, error, invalid } =
    useDataHook(primaryId, ...fieldIds);
  const { color, backgroundColor, hasBorder } = determineColors(cardInfo, dynamicColors, value);
  const rowSpan = cardInfo.config?.dimensions?.rowSpan ?? 1;
  const columnSpan = cardInfo.config?.dimensions?.columnSpan ?? 1;
  const columnStart = getColumnFromGridArea(sharedColumn, cardInfo.gridArea);
  const stretch = cardInfo.gridArea === 3; // Area 3 is the stretch zone.
  const { classes, cx } = useStyles({
    color,
    backgroundColor,
    hasBorder,
    rowSpan,
    columnSpan,
    columnStart,
    stretch,
  });
  const { dateRange } = useSuperGlobalDateRange();
  const [clickState, clickDispatch, canHandleClicks] = useCardInfoClickReducer(cardInfo);
  const { ref, width } = useResizeObserver<HTMLDivElement>();
  const titleString = cardInfo.title?.text ?? '';
  const flexClass = cardInfo.gridArea === 2 ? classes.horizontalCard : classes.verticalCard;
  const { graphParams } = cardInfo;
  const canShowHero = !loading && !error && !invalid;
  const renderLoading = () => {
    return (
      <WhyLabsText inherit className={classes.titleText}>
        Loading
      </WhyLabsText>
    );
  };

  const renderError = () => {
    return (
      <WhyLabsText inherit className={classes.titleText}>
        Error
      </WhyLabsText>
    );
  };

  const renderCardTitle = () => {
    if (graphParams?.type.toLowerCase().includes('timeseries')) {
      const rangeString = getFormattedDateRangeString(dateRange);
      return (
        <>
          <WhyLabsText display="inline-block" size={14}>
            {titleString} in time range
          </WhyLabsText>{' '}
          <WhyLabsText display="inline-block" size={12} fw={500}>
            {rangeString}
          </WhyLabsText>
        </>
      );
    }
    return titleString;
  };

  const renderHeroStack = () => {
    return (
      <>
        <WhyLabsText inherit className={classes.titleText}>
          {renderCardTitle()}
        </WhyLabsText>
        {loading && renderLoading()}
        {!loading && error && renderError()}
        {canShowHero && (
          <CardHero
            color={color}
            value={value}
            precision={cardInfo.heroProperties?.valueAttributes?.precision}
            valueType={cardInfo.heroProperties?.valueAttributes?.valueType}
            altValue={altValue}
            altPrecision={cardInfo.heroProperties?.subHeaderAttributes?.precision}
            altValueType={cardInfo.heroProperties?.subHeaderAttributes?.valueType}
          />
        )}
      </>
    );
  };

  const renderGraph = () => {
    if (graphParams?.type) {
      return (
        <div className={classes.graphWrapper}>
          <DashCardGraph
            cardInfo={cardInfo}
            graphType={graphParams.type}
            fieldValues={fieldValues}
            timeSeriesFieldValues={timeSeriesFieldValues}
            timeSeriesValues={timeSeriesValues}
            toggleOnClickState={clickState}
            width={width ?? GRID_COLUMN_WIDTH_PX}
          />
        </div>
      );
    }
    return null;
  };

  const renderContentStack = () => {
    if (!graphParams?.type || graphParams.type === 'lineChart') {
      return (
        <>
          <div className={classes.blockContainer}>
            <div className={classes.stackContainer}>{renderHeroStack()}</div>
            {renderGraph()}
          </div>
          <DashCardSubGrid
            subGrid={cardInfo.subGrid}
            fieldValues={fieldValues}
            clickAction={canHandleClicks ? clickDispatch : null}
            clickState={canHandleClicks ? clickState : null}
            tabStartIndex={tabStartIndex}
            dynamicColors={dynamicColors}
            loading={loading}
          />
        </>
      );
    }
    // The big time series cards
    return (
      <>
        <div className={classes.blockContainer}>
          <div className={classes.stretchContainer}>
            <div className={classes.stackContainer}>{renderHeroStack()}</div>
            <DashCardSubGrid
              subGrid={cardInfo.subGrid}
              fieldValues={fieldValues}
              gridArea={cardInfo.gridArea}
              clickAction={canHandleClicks ? clickDispatch : null}
              clickState={canHandleClicks ? clickState : null}
              tabStartIndex={tabStartIndex}
              dynamicColors={dynamicColors}
              loading={loading}
            />
          </div>
        </div>
        {renderGraph()}
      </>
    );
  };
  return (
    <div className={cx(classes.styledCard, flexClass)} ref={ref}>
      {renderContentStack()}{' '}
    </div>
  );
};

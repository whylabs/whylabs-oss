import { useMemo } from 'react';

import {
  GRAPH_HEIGHT,
  GRAPH_WIDTH,
  Y_RANGE_BUFFER_RATIO,
  GRAPH_VERTICAL_BUFFER,
  GRAPH_HORIZONTAL_BUFFER,
  FLEXIBLE_GRAPH_SVG_PADDING,
  STANDARD_GRAPH_HORIZONTAL_BORDERS,
} from 'ui/constants';
import { useHover } from 'hooks/useHover';
import { curveLinear } from '@visx/curve';
import { Group } from '@visx/group';
import { scaleLinear, scaleOrdinal } from '@visx/scale';
import { LinePath } from '@visx/shape';
import { useTooltip, TooltipWithBounds, defaultStyles } from '@visx/tooltip';

import { useChartStyles } from 'hooks/useChartStyles';
import { useDeepCompareMemo } from 'use-deep-compare';
import { friendlyFormat, getMinAndMaxValueFromArray } from 'utils/numberUtils';
import { useCommonStyles } from 'hooks/useCommonStyles';
import { areAllDefinedAndNonNull, isExactlyNullOrUndefined } from 'utils';
import { TimePeriod } from 'generated/graphql';
import { LabelItem, LineChartDatum } from 'types/graphTypes';
import { timeLong } from 'utils/dateUtils';
import { mapReverse } from 'utils/arrayUtils';
import { useRecoilState } from 'recoil';
import { drawnMenuAtom } from 'atoms/drawnMenuAtom';
import { CardType } from 'components/cards/why-card/types';
import { WhyCardDecorationType } from 'components/cards/why-card/WhyCardTexts';
import { useLegendHiding } from 'hooks/useLegendHiding';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';
import { WhyLabsText } from 'components/design-system';
import { openEndDateRangeTransformer } from 'utils/batchProfileUtils';
import { generateDatedXScale } from '../vizutils/scaleUtils';
import {
  BoxLegend,
  DateBottomAxis,
  HoverLine,
  AlertIcons,
  StandardVerticalAxis,
  FlexibleFrame,
  SecondaryVerticalAxis,
} from '../components';
import { graphSnappyTooltipStyles } from '../vizutils/styleUtils';
import { renderCircle, renderLegendItem, STANDARD_POINT_WIDTH } from '../vizutils/shapeUtils';
import { generateUnionArrays } from '../vizutils/dataUtils';

const MIN_Y_RANGE = 100;

const tooltipStyles = {
  ...defaultStyles,
  ...graphSnappyTooltipStyles,
};

interface SimpleLineVisxChartProps {
  datedData: LineChartDatum[];
  batchFrequency?: TimePeriod;
  height?: number;
  width?: number;
  showDecimals?: boolean;
  verticalOffset?: number;
  minYMax?: number;
  graphLabel?: string;
  hideLegend?: boolean;
  cardType?: CardType;
  decorationCardType?: WhyCardDecorationType;
  secondaryGraphLabel?: string;
}

interface TooltipDatum {
  chartDatum: LineChartDatum | null;
  timestamp: number;
}

const SimpleLineVisxChart: React.FC<SimpleLineVisxChartProps> = ({
  datedData,
  batchFrequency = TimePeriod.P1D,
  height = GRAPH_HEIGHT,
  width = GRAPH_WIDTH,
  showDecimals = false,
  verticalOffset = 0,
  minYMax = MIN_Y_RANGE,
  graphLabel = 'Output / Input Count',
  hideLegend = false,
  cardType = 'output',
  decorationCardType = 'output_count',
  secondaryGraphLabel,
}) => {
  const { classes: styles } = useCommonStyles();
  const { tooltipOpen, tooltipLeft, tooltipTop, tooltipData, hideTooltip, showTooltip } = useTooltip<TooltipDatum>();
  const { dateRange } = useSuperGlobalDateRange();
  const { from, to } = openEndDateRangeTransformer(dateRange);

  const displaySecondaryAxis = !isExactlyNullOrUndefined(secondaryGraphLabel);
  const graphWidth = width - STANDARD_GRAPH_HORIZONTAL_BORDERS;
  const { classes: chartStyles } = useChartStyles();
  const [hoverState, hoverDispatch] = useHover();
  const [legendState, legendDispatch] = useLegendHiding();
  const numLines = Math.max(...datedData.map((d) => d.values.length));
  const [drawnMenuState] = useRecoilState(drawnMenuAtom);
  const colorDomain = Array.from(
    datedData.reduce((acc, datum) => {
      datum.labels.forEach((l, idx) => acc.add([l, datum.colors[idx % datum.colors.length]]));
      return acc;
    }, new Set<[string, string]>()),
  );
  datedData.sort((a, b) => a.dateInMillis - b.dateInMillis);

  const { datedData: updatedDatedData, alignedData } = useDeepCompareMemo(
    () => generateUnionArrays(datedData, [], [from, to], batchFrequency),
    [datedData, batchFrequency, from, to],
  );
  const xScale = useDeepCompareMemo(
    () => generateDatedXScale(updatedDatedData, graphWidth - GRAPH_HORIZONTAL_BUFFER, GRAPH_HORIZONTAL_BUFFER),
    [updatedDatedData, width],
  );

  const yScale = useDeepCompareMemo(() => {
    const [minY, maxY] = getMinAndMaxValueFromArray(datedData.reduce<number[]>((acc, d) => [...acc, ...d.values], []));
    const graphMaxY = Math.max(maxY, minYMax) * (1 + Y_RANGE_BUFFER_RATIO);
    const minMultiple = minY > 0 ? 1 - Y_RANGE_BUFFER_RATIO : 1 + Y_RANGE_BUFFER_RATIO;
    const graphMinY = verticalOffset > 0 ? minY * minMultiple : 0;
    return scaleLinear<number>({
      range: [height, GRAPH_VERTICAL_BUFFER],
      round: true,
      domain: [graphMinY, graphMaxY],
    }).nice();
  }, [datedData, minYMax, verticalOffset]);

  const colorScale = useMemo(
    () =>
      scaleOrdinal<string, string>({
        domain: colorDomain.map((pair) => pair[0]),
        range: colorDomain.map((pair) => pair[1]),
      }),
    [colorDomain],
  );

  const handleLegendClick = (item: LabelItem) => {
    legendDispatch(item.datum);
  };

  const renderLegend = () => (
    <BoxLegend
      name="monitor-output"
      colorScale={colorScale}
      hoverState={hoverState}
      hoverDispatch={hoverDispatch}
      onClick={handleLegendClick}
      hiddenLegendItems={legendState}
      shape="line"
    />
  );

  if (numLines < 1) {
    return null;
  }

  const renderLinePoints = () => {
    return (
      <>
        {alignedData.map((datum, alignedIndex) => {
          if (datum === null) {
            return null;
          }
          const xPosition = xScale(datum.dateInMillis);

          return mapReverse(datum.values, (yVal, idx) => {
            if (legendState.includes(colorDomain[idx][0])) return null;
            const colorSize = datum.colors.length;
            const color = datum.colors[idx % colorSize];
            return renderCircle(
              xPosition,
              yScale(yVal),
              color,
              true,
              `line-point-${idx}-${alignedIndex}-${xPosition}`,
              STANDARD_POINT_WIDTH,
            );
          });
        })}
      </>
    );
  };

  const profilesWithData = new Set(updatedDatedData.map((d) => d.dateInMillis));

  const renderHoverLine = () => (
    <HoverLine
      name="simple-line"
      decorationCardType={decorationCardType}
      cardType={cardType}
      data={updatedDatedData}
      isCorrelatedAnomalies={false}
      profilesWithData={profilesWithData}
      xScale={xScale}
      hoverState={hoverState}
      hoverDispatch={hoverDispatch}
      hideTooltip={hideTooltip}
      graphHeight={height}
      graphVerticalBuffer={GRAPH_VERTICAL_BUFFER}
      graphWidth={width}
      graphLeftOffset={10}
      graphTopOffset={0}
      showTooltip={({ index, left, top }) => {
        showTooltip({
          tooltipData: { chartDatum: alignedData[index], timestamp: updatedDatedData[index].dateInMillis },
          tooltipTop: top + verticalOffset,
          tooltipLeft: left,
        });
      }}
    />
  );

  const renderAlertIcons = () => (
    <AlertIcons
      name="simple-line"
      isCorrelatedAnomalies={false}
      decorationCardType={decorationCardType}
      profilesWithData={profilesWithData}
      cardType={cardType}
      data={updatedDatedData}
      xScale={xScale}
      hoverDispatch={hoverDispatch}
      alerts={[]}
      graphHeight={height}
      graphVerticalBuffer={GRAPH_VERTICAL_BUFFER}
      graphWidth={width}
      showTooltip={({ index, left, top }) => {
        showTooltip({
          tooltipData: { chartDatum: alignedData[index], timestamp: updatedDatedData[index].dateInMillis },
          tooltipTop: top + verticalOffset,
          tooltipLeft: left,
        });
      }}
      hideTooltip={hideTooltip}
    />
  );

  const renderTooltip = () => {
    if (drawnMenuState.open || !tooltipOpen || !areAllDefinedAndNonNull(tooltipLeft, tooltipTop, tooltipData)) {
      return null;
    }

    const nonNullTooltipData = tooltipData as TooltipDatum;
    const numDecimals = showDecimals ? 2 : 0;
    return (
      <div>
        <TooltipWithBounds top={tooltipTop} left={tooltipLeft} style={{ ...tooltipStyles }}>
          <div className={styles.tooltipRow}>
            <WhyLabsText inherit className={chartStyles.tooltipHeadline}>{`${timeLong(
              nonNullTooltipData.timestamp,
              batchFrequency,
            )}`}</WhyLabsText>
          </div>
          {nonNullTooltipData.chartDatum &&
            nonNullTooltipData.chartDatum.values.map((val, idx) => {
              const color = nonNullTooltipData.chartDatum!.colors[idx % nonNullTooltipData.chartDatum!.colors.length];
              const label = nonNullTooltipData.chartDatum!.labels[idx % nonNullTooltipData.chartDatum!.labels.length];
              return (
                <div className={styles.tooltipRow} key={`tooltip-${label}-${val}`}>
                  <div className={styles.square}>{renderLegendItem(color, label, undefined, 'line')}</div>
                  <WhyLabsText inherit className={chartStyles.tooltipBody}>{`${label}: ${friendlyFormat(
                    val,
                    numDecimals,
                  )}`}</WhyLabsText>
                </div>
              );
            })}
          {!nonNullTooltipData.chartDatum && (
            <WhyLabsText inherit className={chartStyles.squishyTooltipBody}>
              No data available
            </WhyLabsText>
          )}
        </TooltipWithBounds>
      </div>
    );
  };

  const renderLines = () => (
    <>
      {mapReverse([...Array(numLines).fill(0)], (_, idx) => {
        if (legendState.includes(colorDomain[idx][0])) return null;
        return (
          <LinePath<LineChartDatum>
            key={`linepath-${colorDomain[idx][0]}`}
            data={datedData}
            curve={curveLinear}
            x={(d) => xScale(d.dateInMillis)}
            y={(d) => yScale(d.values[idx])}
            stroke={colorScale(colorDomain[idx][0])}
            strokeWidth={1}
            shapeRendering="geometricPrecision"
          />
        );
      })}
    </>
  );

  return (
    <div className={styles.longGraphContainer}>
      <svg width={width} height={height + FLEXIBLE_GRAPH_SVG_PADDING}>
        <Group top={0} left={10}>
          <FlexibleFrame
            yScale={yScale}
            timeScale={xScale}
            ticksInMillis={datedData.map((d) => d.dateInMillis)}
            height={height + FLEXIBLE_GRAPH_SVG_PADDING}
            width={graphWidth}
            batchFrequency={batchFrequency}
          />
          {renderLines()}
          {renderLinePoints()}
          <StandardVerticalAxis yScale={yScale} label={graphLabel} squishText />
          {displaySecondaryAxis && (
            <SecondaryVerticalAxis
              yScale={yScale}
              label={secondaryGraphLabel}
              right={graphWidth - GRAPH_HORIZONTAL_BUFFER}
            />
          )}
          <DateBottomAxis
            xScale={xScale}
            width={graphWidth}
            ticksInMillis={datedData.map((d) => d.dateInMillis)}
            horizontalBuffer={GRAPH_HORIZONTAL_BUFFER}
          />
          {renderAlertIcons()}
          {renderHoverLine()}
        </Group>
      </svg>
      {!hideLegend && renderLegend()}
      {renderTooltip()}
    </div>
  );
};

export default SimpleLineVisxChart;

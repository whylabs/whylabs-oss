import { scaleBand, scaleLinear, scaleOrdinal } from '@visx/scale';
import { useMemo, useState } from 'react';
import { Group } from '@visx/group';
import { AnalysisDataFragment, TimePeriod } from 'generated/graphql';
import { useHover } from 'hooks/useHover';
import { useLegendHiding } from 'hooks/useLegendHiding';
import { LabelItem } from 'types/graphTypes';
import {
  FLEXIBLE_GRAPH_SVG_PADDING,
  GRAPH_VERTICAL_BUFFER,
  MIN_CAT_HEIGHT,
  STANDARD_GRAPH_HORIZONTAL_BORDERS,
} from 'ui/constants';
import { Bar } from '@visx/shape';
import { useTooltip } from '@visx/tooltip';
import { useChartStyles } from 'hooks/useChartStyles';
import { CardType } from 'components/cards/why-card/types';
import { useGraphProfileInteraction } from 'hooks/useGraphProfileInteraction';
import { ParsedSegment } from 'pages/page-types/pageUrlQuery';
import { useDeepCompareMemo } from 'use-deep-compare';
import { getAlgorithmByString } from 'components/panels/monitoring/monitor-manager/custom-monitor/CustomMonitorTypes';
import {
  classifyVisibleItems,
  DistributionValues,
  prepareFrequentItemsWithOtherData,
  StackedTimestampedBar,
} from 'pages/llm-dashboards/utils';
import { Colors } from '@whylabs/observatory-lib';
import { useRecoilState } from 'recoil';
import { drawnMenuAtom } from 'atoms/drawnMenuAtom';
import { WhyCardDecorationType } from 'components/cards/why-card/WhyCardTexts';
import { SimpleDateRange } from 'utils/dateRangeUtils';
import { AlertIcons, BoxLegend, StandardVerticalAxis } from '../components';
import DateBottomOrdinalAxis from '../components/DateBottomOrdinalAxis';
import FlexibleOrdinalFrame from '../components/FlexibleOrdinalFrame';
import { MonitoringChartMenu } from '../components/monitoring-chart-menu/MonitoringChartMenu';
import {
  AnalysisChartTooltip,
  AnalysisTooltipDatum,
  useMountFrequentItemsTooltip,
} from '../drift-graphs/DistributionTooltip';
import { mapAlgorithmsName } from '../quantile-chart/helpers';
import NoDataChart from '../no-data-chart/NoDataChart';
import { generateUnionArrays } from '../vizutils/dataUtils';

const GRAPH_HORIZONTAL_BUFFER = 48;

interface BarDatum {
  timestamp: number;
  [key: string]: number;
}

interface StackedCategoryVisxChartProps {
  width: number;
  height: number;
  dateRange?: [number, number];
  label: string;
  distributionValues: DistributionValues;
  analysisResults: AnalysisDataFragment[];
  cardType: CardType;
  decorationCardType?: WhyCardDecorationType;
  batchFrequency?: TimePeriod;
  fixedYRange?: [number, number];
  horizontalBuffer?: number;
  endHorizontalBuffer?: number;
  navigationInformation: {
    resourceId: string;
    segment: ParsedSegment;
    columnId: string;
    customDateRange?: SimpleDateRange;
  };
}

const TOP_Y_BUFFER_RATIO = 1.05;

type ClickMenuInfo = {
  timestamp: number;
  previousTimestamps: number[];
  event: React.MouseEvent<SVGRectElement, MouseEvent>;
  datum: BarDatum;
};

export const StackedCategoryVisxChart: React.FC<StackedCategoryVisxChartProps> = ({
  width,
  height,
  distributionValues = [],
  dateRange,
  cardType,
  decorationCardType,
  label,
  analysisResults,
  batchFrequency,
  fixedYRange,
  horizontalBuffer = GRAPH_HORIZONTAL_BUFFER,
  endHorizontalBuffer = GRAPH_HORIZONTAL_BUFFER,
  navigationInformation,
}) => {
  const [hoverState, hoverDispatch] = useHover();
  const [clickMenuInfo, setClickMenuInfo] = useState<ClickMenuInfo | null>(null);
  const [legendState, legendDispatch] = useLegendHiding();
  const { tooltipOpen, tooltipLeft, tooltipTop, tooltipData, hideTooltip, showTooltip } =
    useTooltip<AnalysisTooltipDatum>();
  const { classes: chartStyles } = useChartStyles();
  const { resourceId, segment, columnId } = navigationInformation;
  const usedColumnId = navigationInformation?.columnId || columnId;
  const userResourceId = navigationInformation?.resourceId || resourceId;
  const navToProfiles = useGraphProfileInteraction({
    modelId: userResourceId,
    segment: navigationInformation?.segment || segment,
    featureId: usedColumnId,
    clickItemTimestamp: clickMenuInfo?.timestamp ?? 0,
    previousTimestamps: clickMenuInfo?.previousTimestamps ?? [],
    customDateRange: navigationInformation?.customDateRange,
  });
  const { shownCategories, otherCategories, otherName } = classifyVisibleItems(distributionValues);

  const shownCategoryList = shownCategories.map((category) => category[0]);
  const otherCategoryList = otherCategories.map((category) => category[0]);
  const data = distributionValues?.map((datum) => ({
    ...prepareFrequentItemsWithOtherData(
      datum.timestamp,
      datum.frequentItems,
      shownCategoryList,
      otherCategoryList,
      otherName,
    ),
    dateInMillis: datum.timestamp,
  }));

  const { datedData, alignedData } = useMemo(
    () =>
      dateRange ? generateUnionArrays(data, [], dateRange, batchFrequency) : { datedData: data, alignedData: data },
    [batchFrequency, data, dateRange],
  );

  const visibleCategories = shownCategoryList;
  const colorRange = [...Colors.chartColorArray];
  if (otherCategoryList.length > 0) {
    visibleCategories.unshift(otherName);
    colorRange.unshift(Colors.brandSecondary800);
  }
  const colorScale = useDeepCompareMemo(
    // required b/c the arrays above could make it change on every render with useMemo, according to React
    () =>
      scaleOrdinal<string, string>({
        domain: visibleCategories,
        range: colorRange,
      }),
    [colorRange, visibleCategories],
  );
  let tooltipTimeout: number;
  const graphWidth =
    width > STANDARD_GRAPH_HORIZONTAL_BORDERS
      ? width - STANDARD_GRAPH_HORIZONTAL_BORDERS
      : STANDARD_GRAPH_HORIZONTAL_BORDERS + 10;
  const xScale = useMemo(
    () =>
      scaleBand({
        range: [horizontalBuffer, graphWidth - endHorizontalBuffer],
        domain: datedData.map((datum) => datum.dateInMillis),
        paddingInner: 0.2,
        paddingOuter: 0.2,
      }),
    [datedData, graphWidth, horizontalBuffer, endHorizontalBuffer],
  );
  const filteredCategories = useMemo(
    () => visibleCategories.filter((vc) => !legendState.includes(vc)),
    [legendState, visibleCategories],
  );
  const columnTotals = useMemo(() => {
    if (!alignedData) return [];
    return alignedData.map(
      (d) =>
        d?.estimates?.reduce((acc, curr, idx) => {
          if (filteredCategories.includes(d.values[idx])) {
            return acc + curr;
          }
          return acc;
        }, 0) ?? 0,
    );
  }, [alignedData, filteredCategories]);
  const algorithm = getAlgorithmByString.get(analysisResults[0]?.algorithm ?? '');
  const algorithmName = (algorithm && mapAlgorithmsName.get(algorithm)) || 'Drift distance';
  const mountTooltip = useMountFrequentItemsTooltip({
    algorithmName,
    colorScale,
    batchFrequency: batchFrequency ?? TimePeriod.P1D,
    filteredCategories,
    filteredAnalysis: analysisResults,
  });
  const tooltipsCalculated = useDeepCompareMemo(() => {
    const cardsTooltips: { [index: number]: AnalysisTooltipDatum } = {};
    alignedData.every((datum, index) => {
      const filteredItems = datum?.values?.map((value, idx) => ({ value, estimate: datum.estimates[idx] ?? 0 }));
      cardsTooltips[index] = mountTooltip({
        timestamp: datedData[index].dateInMillis,
        event: null,
        item: datum
          ? {
              dateInMillis: datedData[index].dateInMillis ?? 0,
              showAsDiscrete: true,
              frequentItems: filteredItems ?? [],
            }
          : null,
      });
      return true;
    });
    return cardsTooltips;
  }, [datedData, alignedData, mountTooltip]);

  const yMax = useMemo(() => Math.max(...columnTotals, 1), [columnTotals]);
  const graphHeight = height - GRAPH_VERTICAL_BUFFER;
  const yScale = useMemo(() => {
    const usedYMax = fixedYRange?.[1] ?? yMax;
    const dataRange = [fixedYRange?.[0] ?? 0, usedYMax * TOP_Y_BUFFER_RATIO];
    return scaleLinear({
      range: [height, GRAPH_VERTICAL_BUFFER],
      round: true,
      domain: dataRange,
    }).nice();
  }, [fixedYRange, yMax, height]);

  const handleClick = (item: LabelItem) => {
    legendDispatch(item.datum);
  };
  const renderLegend = () => (
    <BoxLegend
      shape="box"
      name="histogram"
      colorScale={colorScale}
      hoverState={hoverState}
      hoverDispatch={hoverDispatch}
      onClick={handleClick}
      hiddenLegendItems={legendState}
      capitalize={false}
    />
  );

  const renderTooltip = () => {
    if (!tooltipData) return null;
    return (
      <div>
        <AnalysisChartTooltip
          tooltipOpen={tooltipOpen}
          tooltipLeft={tooltipLeft}
          tooltipTop={tooltipTop}
          tooltipData={tooltipData}
        />
      </div>
    );
  };
  const [drawnMenuState, setDrawnMenuState] = useRecoilState(drawnMenuAtom);
  const renderDrawnMenu = () => {
    if (!clickMenuInfo) {
      return null;
    }
    if (drawnMenuState.open) setDrawnMenuState({ open: false });
    const { event } = clickMenuInfo;
    return (
      <MonitoringChartMenu
        isMissingDataPoint={!!drawnMenuState.isMissingDataPoint}
        decorationCardType={decorationCardType}
        navigationInformation={navigationInformation}
        opened={clickMenuInfo !== null}
        profileBatchTimestamp={clickMenuInfo?.timestamp ?? 0}
        position={{
          x: (event?.pageX ?? 0) - 2,
          y: event?.pageY ?? 0,
          clientX: event?.clientX ?? 0,
          clientY: event?.clientY ?? 0,
        }}
        dataPointAnomalies={analysisResults.filter(
          (an) => an.isAnomaly && an.datasetTimestamp === clickMenuInfo?.timestamp,
        )}
        profilePageHandler={navToProfiles}
        cardType={cardType}
        allowVisualizeCorrelatedAnomalies={false}
      />
    );
  };

  const renderHover = (graphData: (StackedTimestampedBar | null)[]) => {
    const mappedData: BarDatum[] = datedData.map(({ dateInMillis }, index) => {
      const mappedObject: BarDatum = { timestamp: dateInMillis };
      const d = graphData[index];
      d?.values.forEach((key, idx) => {
        mappedObject[key] = d.estimates[idx];
      });
      return mappedObject;
    });
    return (
      <Group>
        {mappedData.map((datum, idx) => {
          return (
            <Bar
              key={`bar-hover-${datum.timestamp}`}
              x={xScale(datum.timestamp)!}
              height={graphHeight}
              y={GRAPH_VERTICAL_BUFFER}
              width={xScale.bandwidth()}
              className={chartStyles.hoverShadow}
              onClick={(event) => {
                if (tooltipTimeout) clearTimeout(tooltipTimeout);
                hideTooltip();
                setClickMenuInfo(null); // clear the previous click
                const previousTimestamps: number[] = [];
                if (idx > 1) {
                  const prevTimestamp = mappedData[idx - 1];
                  if (prevTimestamp) previousTimestamps.push(prevTimestamp.timestamp);
                }
                if (idx > 2) {
                  const prevTimestamp = mappedData[idx - 2];
                  if (prevTimestamp) previousTimestamps.push(prevTimestamp.timestamp);
                }
                setClickMenuInfo({ timestamp: datum.timestamp, event, datum, previousTimestamps });
              }}
              onMouseMove={(event) => {
                if (clickMenuInfo) {
                  return;
                }
                if (tooltipTimeout) clearTimeout(tooltipTimeout);

                const mouseX = event.clientX;
                const mouseY = event.clientY;
                showTooltip({
                  tooltipData: tooltipsCalculated[idx],
                  tooltipLeft: mouseX,
                  tooltipTop: mouseY,
                });
              }}
              onMouseLeave={() => {
                tooltipTimeout = window.setTimeout(() => {
                  hideTooltip();
                }, 300);
              }}
            />
          );
        })}
      </Group>
    );
  };
  const renderBars = (graphData: (StackedTimestampedBar | null)[]) => {
    const mappedData: (BarDatum | null)[] = graphData.map((d) => {
      if (!d) return null;
      const mappedObject: BarDatum = { timestamp: d.timestamp };
      d.values.forEach((key, index) => {
        mappedObject[key] = d.estimates[index];
      });
      return mappedObject;
    });

    const graphBottom = yScale.range()[0];
    return (
      <Group>
        {mappedData.map((datum) => {
          if (!datum) return null;
          let runningY = graphBottom;
          return (
            <Group key={`bar-group-${datum.timestamp}`}>
              {filteredCategories.map((cat) => {
                if (datum[cat]) {
                  const catHeight = Math.max(graphBottom - yScale(datum[cat]), MIN_CAT_HEIGHT);
                  runningY -= catHeight;
                  return (
                    <Bar
                      key={`bar-subpart-${cat}-${datum.timestamp}`}
                      x={xScale(datum.timestamp)!}
                      height={catHeight}
                      y={runningY}
                      width={xScale.bandwidth()}
                      fill={colorScale(cat)}
                    />
                  );
                }
                return null;
              })}
            </Group>
          );
        })}
      </Group>
    );
  };

  const renderAlertIcons = () => {
    return (
      <svg onClick={() => setClickMenuInfo(null)}>
        <AlertIcons
          hackToFixAlertInLLMS
          isCorrelatedAnomalies={false}
          profilesWithData={new Set()}
          name="discrete-stack"
          data={datedData}
          offset={xScale.bandwidth() / 2}
          navigationInformation={navigationInformation}
          cardType={cardType}
          decorationCardType={decorationCardType}
          xScale={xScale}
          hoverDispatch={hoverDispatch}
          alerts={analysisResults.filter((event) => !!event.isAnomaly)}
          graphHeight={height}
          graphWidth={width}
          showTooltip={({ index, left, top }) => {
            showTooltip({
              tooltipData: tooltipsCalculated[index],
              tooltipLeft: left,
              tooltipTop: top,
            });
          }}
          hideTooltip={hideTooltip}
        />
      </svg>
    );
  };

  const renderNoData = (message: string) => {
    return (
      <div style={{ width, display: 'flex', justifyContent: 'center', alignItems: 'center', height }}>
        <NoDataChart noDataMessage={message} />
      </div>
    );
  };

  if (!alignedData?.length || !distributionValues?.length) {
    return renderNoData('Insufficient data available for time period.');
  }

  if (!shownCategoryList?.length) {
    return renderNoData('No patterns have been detected in the text for this range.');
  }

  return (
    <>
      <svg width={width} height={height + FLEXIBLE_GRAPH_SVG_PADDING} onMouseLeave={() => setClickMenuInfo(null)}>
        <Group top={0} left={10}>
          <FlexibleOrdinalFrame
            yScale={yScale}
            xScale={xScale}
            height={height + FLEXIBLE_GRAPH_SVG_PADDING}
            width={graphWidth}
            horizontalBuffer={horizontalBuffer}
            endHorizontalBuffer={endHorizontalBuffer}
          />
          <StandardVerticalAxis yScale={yScale} label={label} squishText />
          <DateBottomOrdinalAxis xScale={xScale} batchFrequency={batchFrequency} height={height} width={graphWidth} />
          {renderBars(alignedData)}
          {renderHover(alignedData)}
          {renderDrawnMenu()}
          {renderAlertIcons()}
        </Group>
      </svg>
      {renderLegend()}
      {renderTooltip()}
    </>
  );
};

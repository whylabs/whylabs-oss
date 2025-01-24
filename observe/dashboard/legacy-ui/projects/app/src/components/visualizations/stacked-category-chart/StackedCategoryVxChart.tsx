import { useContext, useEffect, useMemo } from 'react';
import { Group } from '@visx/group';
import { scaleLinear, scaleOrdinal } from '@visx/scale';
import { Bar } from '@visx/shape';
import { useCommonStyles } from 'hooks/useCommonStyles';
import { useHover } from 'hooks/useHover';
import { useLegendHiding } from 'hooks/useLegendHiding';
import { DatedFrequentItem } from 'utils/createDatedFrequentItems';
import { Colors } from '@whylabs/observatory-lib';
import {
  FLEXIBLE_GRAPH_SVG_PADDING,
  GRAPH_HEIGHT,
  GRAPH_HORIZONTAL_BUFFER,
  GRAPH_VERTICAL_BUFFER,
  GRAPH_WIDTH,
  MIN_CAT_HEIGHT,
  STANDARD_GRAPH_HORIZONTAL_BORDERS,
  Y_RANGE_BUFFER_RATIO,
} from 'ui/constants';
import { DatedData, LabelItem } from 'types/graphTypes';
import { useTooltip } from '@visx/tooltip';
import { getAlertTime } from 'utils/createAlerts';
import { useDeepCompareMemo } from 'use-deep-compare';
import { AnalysisDataFragment, TimePeriod } from 'generated/graphql';
import {
  AlertIcons,
  BoxLegend,
  DateBottomAxis,
  FlexibleFrame,
  HoverBars,
  ShadowBars,
  StandardVerticalAxis,
} from 'components/visualizations/components';
import { generateDatedXScale } from 'components/visualizations/vizutils/scaleUtils';
import { generateUnionArrays } from 'components/visualizations/vizutils/dataUtils';
import { getBatchStep } from 'utils/timeUtils';
import { useRecoilState } from 'recoil';
import { CardType } from 'components/cards/why-card/types';
import { analysisTooltipsCacheAtom } from 'atoms/analysisTooltipsCacheAtom';
import { arrayOfLength } from 'utils/arrayUtils';
import { AnalysisContext } from 'pages/shared/AnalysisContext';
import { getAlgorithmByString } from 'components/panels/monitoring/monitor-manager/custom-monitor/CustomMonitorTypes';
import { WhyCardDecorationType } from 'components/cards/why-card/WhyCardTexts';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';
import { openEndDateRangeTransformer } from 'utils/batchProfileUtils';
import { generateColorRange, prepareCategoriesWithOtherData } from './utils';
import { mapAlgorithmsName } from '../quantile-chart/helpers';
import {
  AnalysisChartTooltip,
  AnalysisTooltipDatum,
  useMountFrequentItemsTooltip,
} from '../drift-graphs/DistributionTooltip';

interface StackedCategoryVxChartProps {
  data: DatedFrequentItem[];
  events: AnalysisDataFragment[];
  shownCategories: [string, number][];
  otherCategories: [string, number][];
  height?: number;
  width?: number;
  batchFrequency?: TimePeriod;
  expandProfile?: boolean;
  cardType: CardType;
  decorationCardType?: WhyCardDecorationType;
  isCorrelatedAnomalies: boolean;
  manualColumnId: string;
  unionDataListener?: (data: DatedData[], isDiscrete: boolean) => void;
}

interface GraphDatum {
  dateInMillis: number;
  [key: string]: number;
}

const BAR_TO_SPACE_INITIAL_VALUE = 0.5;
const BAR_TO_SPACE_MAX_VALUE = 1;
const BAR_CALC_MIN = 4;
const BAR_CALC_MAX = 24;
const BAR_RATIO_SLOPE = (BAR_TO_SPACE_MAX_VALUE - BAR_TO_SPACE_INITIAL_VALUE) / (BAR_CALC_MAX - BAR_CALC_MIN);
const BAR_RATIO_INTERCEPT = BAR_TO_SPACE_INITIAL_VALUE - BAR_RATIO_SLOPE * BAR_CALC_MIN;
const BAR_NO_SPACE_THRESHOLD = 80;
const OTHER_CATEGORY_NAME = 'Other';
const ALT_OTHER_CATEGORY_NAME = 'Remaining data';

const StackedCategoryVxChart: React.FC<StackedCategoryVxChartProps> = ({
  data,
  events,
  shownCategories,
  otherCategories,
  height = GRAPH_HEIGHT,
  width = GRAPH_WIDTH,
  batchFrequency = TimePeriod.P1D,
  expandProfile = false,
  cardType,
  decorationCardType,
  isCorrelatedAnomalies,
  manualColumnId,
  unionDataListener,
}) => {
  const TOOLTIP_CACHE_KEY = `${manualColumnId}--drift--drift_top_five`;
  const { classes: styles } = useCommonStyles();
  const algorithm = getAlgorithmByString.get(events[0]?.algorithm ?? '');
  const algorithmName = (algorithm && mapAlgorithmsName.get(algorithm)) || 'Drift distance';
  const { dateRange } = useSuperGlobalDateRange();
  const { from, to } = openEndDateRangeTransformer(dateRange);

  const [{ activeCorrelatedAnomalies }] = useContext(AnalysisContext);
  const disableDrift = !activeCorrelatedAnomalies?.referenceFeature;
  const [hoverState, hoverDispatch] = useHover();
  const [legendState, legendDispatch] = useLegendHiding();
  const { tooltipOpen, tooltipLeft, tooltipTop, tooltipData, hideTooltip, showTooltip } =
    useTooltip<AnalysisTooltipDatum>();

  const alerts = useMemo(() => events.filter((event) => !!event.isAnomaly), [events]);

  const initialCategories = shownCategories.map((sc) => sc[0]);
  const usedOtherName = initialCategories.includes(OTHER_CATEGORY_NAME) ? ALT_OTHER_CATEGORY_NAME : OTHER_CATEGORY_NAME;

  const visibleCategories = useMemo(() => {
    return prepareCategoriesWithOtherData(shownCategories, otherCategories, usedOtherName);
  }, [shownCategories, otherCategories, usedOtherName]);

  data.sort((a, b) => a.dateInMillis - b.dateInMillis);

  const filteredCategories = useMemo(
    () => visibleCategories.filter((vc) => !legendState.includes(vc)),
    [legendState, visibleCategories],
  );
  const filteredData: DatedFrequentItem[] = useDeepCompareMemo(() => {
    const fiData = data
      .filter((d) => d.dateInMillis >= from && d.dateInMillis <= to)
      .map((datum) => ({
        dateInMillis: datum.dateInMillis,
        showAsDiscrete: datum.showAsDiscrete,
        frequentItems: datum.frequentItems.filter((fi) => filteredCategories.includes(fi.value)),
        otherItems: datum.frequentItems
          .filter((fi) => !filteredCategories.includes(fi.value))
          .reduce((acc, curr) => {
            return acc + curr.estimate;
          }, 0),
      }));
    return fiData.map((fid) => ({
      dateInMillis: fid.dateInMillis,
      showAsDiscrete: fid.showAsDiscrete,
      frequentItems: filteredCategories.includes(OTHER_CATEGORY_NAME)
        ? [...fid.frequentItems, { value: OTHER_CATEGORY_NAME, estimate: fid.otherItems }]
        : [...fid.frequentItems],
    }));
  }, [data, filteredCategories]);

  const { datedData, alignedData, alignedEvents } = useDeepCompareMemo(() => {
    return generateUnionArrays(filteredData, [], [from, to], batchFrequency);
  }, [filteredData, from, to, batchFrequency, generateUnionArrays]);

  useEffect(() => {
    if (unionDataListener) {
      unionDataListener(datedData, true);
    }
  }, [datedData, unionDataListener]);

  const offset = getBatchStep(batchFrequency);
  const xScale = useMemo(
    () => generateDatedXScale(datedData, width - GRAPH_HORIZONTAL_BUFFER, GRAPH_HORIZONTAL_BUFFER, offset),
    [datedData, width, offset],
  );

  const dateLength = datedData.length;
  const barRatio = useDeepCompareMemo(() => {
    if (dateLength <= BAR_CALC_MIN) {
      return BAR_TO_SPACE_INITIAL_VALUE;
    }
    if (dateLength <= BAR_CALC_MAX) {
      return BAR_RATIO_SLOPE * dateLength + BAR_RATIO_INTERCEPT;
    }
    return 1;
  }, [dateLength]);

  const barGroupWidth = useDeepCompareMemo(() => {
    const space = datedData.length > BAR_NO_SPACE_THRESHOLD ? 0 : 1;
    const basis =
      datedData.length > 2
        ? xScale(datedData[2].dateInMillis) - xScale(datedData[1].dateInMillis) - space
        : (width - 2 * GRAPH_HORIZONTAL_BUFFER) / datedData.length;
    const usedBasis = basis > 2 ? basis : 2;
    return barRatio * usedBasis;
  }, [datedData, width]);

  const yScale = useMemo(() => {
    let maxSum = 0;
    filteredData.forEach((datum) => {
      maxSum = Math.max(
        maxSum,
        datum.frequentItems.reduce((acc, current) => acc + current.estimate, 0),
      );
    });
    const graphMaxY = Math.round(maxSum * (1 + Y_RANGE_BUFFER_RATIO));
    return scaleLinear<number>({
      range: [height, GRAPH_VERTICAL_BUFFER],
      round: true,
      domain: [0, graphMaxY],
    }).nice();
  }, [filteredData, height]);

  const colorRange = useMemo(() => {
    return generateColorRange(visibleCategories, usedOtherName, Colors.brandSecondary800);
  }, [visibleCategories, usedOtherName]);

  const colorScale = useMemo(
    () =>
      scaleOrdinal<string, string>({
        domain: visibleCategories,
        range: colorRange,
      }),
    [colorRange, visibleCategories],
  );

  const handleClick = (item: LabelItem) => {
    legendDispatch(item.datum);
  };

  const mountTooltip = useMountFrequentItemsTooltip({
    algorithmName,
    colorScale,
    batchFrequency,
    filteredCategories,
    filteredAnalysis: events,
  });

  const [tooltipsCache, setTooltipsCache] = useRecoilState(analysisTooltipsCacheAtom);
  const tooltipsCacheCalculated = useDeepCompareMemo(() => {
    const cardsTooltips: { [index: number]: AnalysisTooltipDatum } = {};
    arrayOfLength(datedData.length).every((_, index) => {
      cardsTooltips[index] = mountTooltip({
        timestamp: datedData[index].dateInMillis,
        lastUploadTimestamp: alignedData[index]?.lastUploadTimestamp,
        event: alignedEvents[index],
        item: alignedData[index],
      });
      return true;
    });
    return cardsTooltips;
  }, [datedData, alignedData, alignedEvents, mountTooltip]);
  if (tooltipsCache[TOOLTIP_CACHE_KEY] !== tooltipsCacheCalculated) {
    setTooltipsCache((state) => ({
      ...state,
      [TOOLTIP_CACHE_KEY]: tooltipsCacheCalculated,
    }));
  }

  const renderTooltip = () => {
    if (!tooltipData) return null;
    return (
      <AnalysisChartTooltip
        tooltipOpen={tooltipOpen}
        tooltipLeft={tooltipLeft}
        tooltipTop={tooltipTop}
        tooltipData={tooltipData}
      />
    );
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

  const renderBars = (graphData: DatedFrequentItem[]) => {
    const mappedData: GraphDatum[] = graphData.map((d) => {
      const keys = d.frequentItems.map((fi) => fi.value);
      const estimates = d.frequentItems.map((fi) => fi.estimate);
      const mappedObject: GraphDatum = { dateInMillis: d.dateInMillis };
      keys.forEach((key, index) => {
        mappedObject[key] = estimates[index];
      });
      return mappedObject;
    });
    return (
      <Group>
        {mappedData.map((datum) => {
          let runningY = height;
          return (
            <Group key={`bar-group-${datum.dateInMillis}`}>
              {filteredCategories.map((cat) => {
                if (datum[cat]) {
                  const catHeight = Math.max(height - yScale(datum[cat]), MIN_CAT_HEIGHT);
                  runningY -= catHeight;
                  return (
                    <Bar
                      key={`bar-subpart-${cat}-${datum.dateInMillis}`}
                      x={xScale(datum.dateInMillis) - barGroupWidth / 2}
                      height={catHeight}
                      y={runningY}
                      width={barGroupWidth}
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

  const profilesWithData = new Set(alignedData.map((d) => d?.dateInMillis).filter((d): d is number => !!d));

  const renderHoverBars = () => (
    <HoverBars
      cardType={cardType}
      decorationCardType={decorationCardType}
      isCorrelatedAnomalies={isCorrelatedAnomalies}
      name="discrete-stack"
      hoverState={hoverState}
      hoverDispatch={hoverDispatch}
      expandProfileOption={expandProfile}
      data={datedData}
      profilesWithData={profilesWithData}
      alerts={alerts}
      xScale={xScale}
      navigationInformation={{ columnId: manualColumnId }}
      hideTooltip={hideTooltip}
      showLine={false}
      graphHeight={height}
      graphVerticalBuffer={GRAPH_VERTICAL_BUFFER}
      tooltipFlipDisplacementRatio={0.05}
      graphWidth={width}
      showTooltip={({ index, mouseX, mouseY }) => {
        showTooltip({
          tooltipData: tooltipsCache[TOOLTIP_CACHE_KEY]?.[index],
          tooltipTop: mouseY,
          tooltipLeft: mouseX,
        });
      }}
    />
  );
  const renderAlertIcons = () => {
    if (disableDrift) return null;

    return (
      <AlertIcons
        isCorrelatedAnomalies={isCorrelatedAnomalies}
        name="discrete-stack"
        data={datedData}
        profilesWithData={profilesWithData}
        cardType={cardType}
        decorationCardType={decorationCardType}
        xScale={xScale}
        hoverDispatch={hoverDispatch}
        navigationInformation={{ columnId: manualColumnId }}
        alerts={alerts}
        graphHeight={height}
        graphVerticalBuffer={GRAPH_VERTICAL_BUFFER}
        graphWidth={width}
        showTooltip={({ index, mouseX, mouseY }) => {
          showTooltip({
            tooltipData: tooltipsCache[TOOLTIP_CACHE_KEY]?.[index],
            tooltipTop: mouseY,
            tooltipLeft: mouseX,
          });
        }}
        hideTooltip={hideTooltip}
      />
    );
  };

  const renderShadowBars = () => (
    <ShadowBars
      name="discrete-stack"
      hoverState={hoverState}
      data={datedData}
      alerts={alerts.map((al) => getAlertTime(al))}
      xScale={xScale}
      graphHeight={height}
      graphVerticalBuffer={GRAPH_VERTICAL_BUFFER}
      graphWidth={width}
      showBars
      ignoreSides
    />
  );

  return (
    <div className={styles.longGraphContainer}>
      <svg width={width + STANDARD_GRAPH_HORIZONTAL_BORDERS} height={height + FLEXIBLE_GRAPH_SVG_PADDING}>
        <Group top={0} left={10}>
          <FlexibleFrame
            yScale={yScale}
            timeScale={xScale}
            ticksInMillis={datedData.map((d) => d.dateInMillis)}
            height={height + FLEXIBLE_GRAPH_SVG_PADDING}
            width={width}
            batchFrequency={batchFrequency}
          />
          {renderShadowBars()}
          {renderBars(filteredData)}
          <StandardVerticalAxis yScale={yScale} label="Frequent item counts" />
          <DateBottomAxis
            xScale={xScale}
            width={width}
            ticksInMillis={datedData.map((d) => d.dateInMillis)}
            horizontalBuffer={GRAPH_HORIZONTAL_BUFFER}
            batchFrequency={batchFrequency}
          />
          {renderHoverBars()}
          {renderAlertIcons()}
        </Group>
      </svg>
      {renderLegend()}
      {renderTooltip()}
    </div>
  );
};

export default StackedCategoryVxChart;

import { useContext, useMemo } from 'react';
import { curveLinear } from '@visx/curve';
import { Group } from '@visx/group';
import { scaleLinear, scaleOrdinal } from '@visx/scale';
import { LinePath } from '@visx/shape';
import { useTooltip } from '@visx/tooltip';
import { Colors } from '@whylabs/observatory-lib';
import { useDeepCompareMemo } from 'use-deep-compare';
import { DatedSchema } from 'utils/createDatedSchemas';
import { getMinAndMaxValueFromArray } from 'utils/numberUtils';
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
import { FeatureType, ThresholdAnalysisDataFragment, TimePeriod } from 'generated/graphql';
import { useCommonStyles } from 'hooks/useCommonStyles';
import { useAdHoc } from 'atoms/adHocAtom';
import MetricThresholdTooltip from 'components/tooltips/MetricThresholdTooltip';
import { useRecoilState } from 'recoil';
import { drawnMenuAtom } from 'atoms/drawnMenuAtom';
import { AnalysisContext } from 'pages/shared/AnalysisContext';
import { useStateUrlEncoder } from 'hooks/useStateUrlEncoder';
import { ACTION_STATE_TAG } from 'types/navTags';
import { WhyCardDecorationType } from 'components/cards/why-card/WhyCardTexts';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';
import { openEndDateRangeTransformer } from 'utils/batchProfileUtils';
import { BoxLegend, HoverLine, StandardVerticalAxis, AlertIcons } from '../components';
import { generateDatedXScale } from '../vizutils/scaleUtils';
import DateBottomAxis from '../components/DateBottomAxis';
import { DatedTypeData, getSingleTypeData } from './schemaUtils';
import { LINE_WIDTH, renderCircle, STANDARD_POINT_WIDTH } from '../vizutils/shapeUtils';
import FlexibleFrame from '../components/FlexibleFrame';
import { generateUnionArrays } from '../vizutils/dataUtils';
import { SelectedProfileLine } from '../components/HoverLine';

interface SchemaVisxChartProps {
  data: DatedSchema[];
  height?: number;
  width?: number;
  batchFrequency?: TimePeriod;
  anomalies?: ThresholdAnalysisDataFragment[];
  isCorrelatedAnomalies: boolean;
  decorationCardType?: WhyCardDecorationType;
  manualColumnId?: string;
}

interface TooltipDatum {
  timestamp: number;
  lastUploadTimestamp?: number;
  schema: DatedSchema | null;
  index: number;
  mouseY?: number;
  anomaly?: ThresholdAnalysisDataFragment;
}

function getAllTypes(data: DatedSchema[]) {
  return Array.from(
    data.reduce((acc, curr) => {
      curr.typeCounts.forEach((tc) => {
        acc.add(tc.type);
      });
      return acc;
    }, new Set<FeatureType>()),
  );
}

function hasMissingType(data: DatedSchema[], types: FeatureType[]) {
  return data.some((datum) => datum.typeCounts.length !== types.length);
}

const SchemaVisxChart: React.FC<SchemaVisxChartProps> = ({
  data,
  height = GRAPH_HEIGHT,
  width = GRAPH_WIDTH,
  batchFrequency = TimePeriod.P1D,
  anomalies = [],
  isCorrelatedAnomalies,
  decorationCardType,
  manualColumnId,
}) => {
  const { classes: styles } = useCommonStyles();
  const graphWidth = width - STANDARD_GRAPH_HORIZONTAL_BORDERS;
  const { dateRange } = useSuperGlobalDateRange();
  const { from, to } = openEndDateRangeTransformer(dateRange);
  const [hoverState, hoverDispatch] = useHover();
  const [{ activeCorrelatedAnomalies }] = useContext(AnalysisContext);
  const { tooltipOpen, tooltipLeft, tooltipTop, tooltipData, hideTooltip, showTooltip } = useTooltip<TooltipDatum>();
  const [adHocRunId] = useAdHoc();
  const [drawnMenuState] = useRecoilState(drawnMenuAtom);
  const filteredData = data.filter((d) => d.dateInMillis >= from && d.dateInMillis <= to);
  const filteredAnomalies = anomalies.filter(
    (a) => a.datasetTimestamp && a.datasetTimestamp >= from && a.datasetTimestamp <= to,
  );

  const { datedData, alignedData } = useDeepCompareMemo(
    () => generateUnionArrays(filteredData, filteredAnomalies, [from, to], batchFrequency),
    [filteredData, filteredAnomalies, batchFrequency, from, to],
  );
  const dataTypes = getAllTypes(data);
  const allYValues = filteredData.reduce<number[]>((acc, current) => {
    const allCounts = current.typeCounts.map((tc) => tc.count);
    return acc.concat(allCounts);
  }, []);
  if (hasMissingType(data, dataTypes)) {
    allYValues.push(0);
  }
  const [minY, maxY] = getMinAndMaxValueFromArray(allYValues);
  const [graphMinY, graphMaxY] = [minY * (1 - Y_RANGE_BUFFER_RATIO), maxY * (1 + Y_RANGE_BUFFER_RATIO)];

  const xScale = useDeepCompareMemo(
    () => generateDatedXScale(datedData, graphWidth - GRAPH_HORIZONTAL_BUFFER, GRAPH_HORIZONTAL_BUFFER, 0, [from, to]),
    [filteredData, width],
  );

  const yScale = useMemo(
    () =>
      scaleLinear<number>({
        range: [height, GRAPH_VERTICAL_BUFFER],
        round: true,
        domain: [graphMinY, graphMaxY],
      }).nice(),
    [height, graphMinY, graphMaxY],
  );

  const colorScale = useMemo(
    () =>
      scaleOrdinal<string, string>({
        domain: data[0].typeCounts.map((tc) => tc.type.toString().toLowerCase()),
        range: Colors.chartColorArray,
      }),
    [data],
  );

  const renderLegend = () => <BoxLegend name="schema" colorScale={colorScale} hoverState={hoverState} shape="line" />;

  const profilesWithData = new Set(alignedData.map((d) => d?.dateInMillis).filter((d): d is number => !!d));

  const renderAlertIcons = () => (
    <AlertIcons
      cardType="schema"
      decorationCardType={decorationCardType}
      name="schema"
      profilesWithData={profilesWithData}
      data={datedData}
      navigationInformation={{ columnId: manualColumnId }}
      xScale={xScale}
      isCorrelatedAnomalies={isCorrelatedAnomalies}
      hoverDispatch={hoverDispatch}
      alerts={filteredAnomalies.filter((an) => an.isAnomaly)}
      graphHeight={height}
      graphVerticalBuffer={GRAPH_VERTICAL_BUFFER}
      graphWidth={width}
      showTooltip={({ index, left, top }) => {
        showTooltip({
          tooltipData: {
            timestamp: datedData[index].dateInMillis,
            lastUploadTimestamp: alignedData[index]?.lastUploadTimestamp,
            index,
            schema: alignedData[index],
            anomaly: filteredAnomalies.find((an) => an.datasetTimestamp === datedData[index].dateInMillis),
          },
          tooltipTop: top,
          tooltipLeft: left,
        });
      }}
      hideTooltip={hideTooltip}
    />
  );

  const { getAnalysisState } = useStateUrlEncoder();
  const renderSelectedProfile = (): React.ReactNode => {
    const actionState = getAnalysisState(ACTION_STATE_TAG);
    const { graphDecorationType } = actionState ?? {};
    const correlatedSectionActive = activeCorrelatedAnomalies?.referenceFeature;
    if (correlatedSectionActive || graphDecorationType === 'inferred_data_type') {
      return <SelectedProfileLine xScale={xScale} height={height} yStart={GRAPH_VERTICAL_BUFFER} />;
    }
    return null;
  };

  const renderHoverLine = () => (
    <HoverLine
      cardType="schema"
      decorationCardType={decorationCardType}
      name="schema"
      isCorrelatedAnomalies={isCorrelatedAnomalies}
      data={datedData}
      navigationInformation={{ columnId: manualColumnId }}
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
      alerts={filteredAnomalies}
      showTooltip={({ index, left, top, mouseY }) => {
        showTooltip({
          tooltipData: {
            timestamp: datedData[index].dateInMillis,
            lastUploadTimestamp: alignedData[index]?.lastUploadTimestamp,
            index,
            schema: alignedData[index],
            anomaly: filteredAnomalies.find((an) => an.datasetTimestamp === datedData[index].dateInMillis),
            mouseY,
          },
          tooltipTop: top,
          tooltipLeft: left,
        });
      }}
    />
  );

  const renderLines = () => {
    return (
      <>
        {dataTypes.map((dt) => (
          <LinePath<DatedTypeData>
            curve={curveLinear}
            key={`schema-path-${dt.toString().toLowerCase()}`}
            data={getSingleTypeData(alignedData, dt).filter((d) => !!d) as DatedTypeData[]}
            x={(d) => xScale(d!.dateInMillis)}
            y={(d) => yScale(d!.count)}
            stroke={colorScale(dt.toString().toLowerCase())}
            strokeWidth={LINE_WIDTH}
            shapeRendering="geometricPrecision"
          />
        ))}
      </>
    );
  };

  const getGrayOrRedDot = (timestamp: number): string => {
    const tempAnomaly = filteredAnomalies.find((an) => an.datasetTimestamp === timestamp && an.isAnomaly);
    if (adHocRunId) {
      return Colors.chartOrange;
    }
    if (!tempAnomaly || tempAnomaly.isFalseAlarm) {
      return Colors.grey;
    }
    return Colors.red;
  };

  const renderPointsForDataType = (orphanData: (DatedTypeData | null)[], dt: FeatureType) =>
    orphanData.map((datum) => {
      if (!datum) {
        return null;
      }
      const whatColor = filteredAnomalies.find((an) => an.isAnomaly && an.datasetTimestamp === datum.dateInMillis);

      return renderCircle(
        xScale(datum.dateInMillis),
        yScale(datum.count),
        whatColor ? getGrayOrRedDot(datum.dateInMillis) : colorScale(dt.toString().toLowerCase()),
        true,
        `${dt.toString()}-pt-${datum.dateInMillis}`,
        STANDARD_POINT_WIDTH,
      );
    });

  const renderLinePoints = () => (
    <>{dataTypes.map((dt) => renderPointsForDataType(getSingleTypeData(alignedData, dt), dt))}</>
  );

  const tooltipMetrics =
    tooltipData?.schema?.typeCounts.map((tc) => {
      const typeName = tc.type.toString().toLowerCase();
      return {
        label: `${typeName} count`,
        value: tc.count,
        color: colorScale(typeName),
        shape: 'line',
      };
    }) ?? [];

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
          <StandardVerticalAxis yScale={yScale} label="Inferred Data Type Count" />
          <DateBottomAxis
            xScale={xScale}
            width={graphWidth}
            ticksInMillis={datedData.map((d) => d.dateInMillis)}
            horizontalBuffer={GRAPH_HORIZONTAL_BUFFER}
            batchFrequency={batchFrequency}
          />
          {renderSelectedProfile()}
          {renderHoverLine()}
          {renderAlertIcons()}
        </Group>
      </svg>
      {renderLegend()}
      {tooltipOpen && (
        <MetricThresholdTooltip
          analysisResult={tooltipData?.anomaly}
          batchFrequency={batchFrequency}
          lastUploadTimestamp={tooltipData?.lastUploadTimestamp}
          metrics={tooltipMetrics}
          primaryMetricLabel="Inferred Data Type Count"
          open={tooltipOpen && !drawnMenuState.open}
          timestamp={tooltipData?.timestamp}
          tooltipLeft={tooltipLeft}
          tooltipTop={tooltipTop}
          mouseY={tooltipData?.mouseY}
        />
      )}
    </div>
  );
};

export default SchemaVisxChart;

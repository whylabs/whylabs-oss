import { useState, useCallback, useContext } from 'react';

import { ScaleTime } from 'd3-scale';
import { localPoint } from '@visx/event';
import { Bar, Line } from '@visx/shape';
import { HoverAction, HoverState } from 'hooks/useHover';
import { Colors } from '@whylabs/observatory-lib';
import { GRAPH_HEIGHT, GRAPH_VERTICAL_BUFFER, GRAPH_WIDTH } from 'ui/constants';
import { Group } from '@visx/group';
import { DatedData } from 'types/graphTypes';
import { useRecoilState } from 'recoil';
import { hoverAtom } from 'atoms/hoverAtom';
import { drawnMenuAtom } from 'atoms/drawnMenuAtom';
import { getAlertTime } from 'utils/createAlerts';
import { AnalysisDataFragment } from 'generated/graphql';
import { getParam, usePageTypeWithParams } from 'pages/page-types/usePageType';
import { CardType } from 'components/cards/why-card/types';
import { ACTION_STATE_TAG, SELECTED_TIMESTAMP } from 'types/navTags';
import { useQueryParams } from 'utils/queryUtils';
import { AnalysisContext } from 'pages/shared/AnalysisContext';
import { CardDataContext } from 'components/cards/why-card/CardDataContext';
import { useGraphProfileInteraction } from 'hooks/useGraphProfileInteraction';
import { WhyCardDecorationType } from 'components/cards/why-card/WhyCardTexts';
import { ParsedSegment } from 'pages/page-types/pageUrlQuery';
import { SimpleDateRange } from 'utils/dateRangeUtils';
import { MonitoringChartMenu } from './monitoring-chart-menu/MonitoringChartMenu';

interface HoverLineProps {
  name: string;
  data: DatedData[];
  xScale: ScaleTime<number, number>;
  hoverState: HoverState;
  hoverDispatch: React.Dispatch<HoverAction>;
  graphLeftOffset: number;
  graphTopOffset: number;
  alerts?: AnalysisDataFragment[];
  hideTooltip: () => void;
  showTooltip: (tooltipArgs: { index: number; left: number; top: number; mouseX?: number; mouseY?: number }) => void;
  debug?: boolean;
  showLine?: boolean;
  graphHeight?: number;
  graphVerticalBuffer?: number;
  graphWidth?: number;
  bottomBuffer?: boolean;
  profilesWithData: Set<number>;
  nudgeX?: number;
  allowBaselineComparison?: boolean;
  navigationInformation?: {
    resourceId?: string;
    segment?: ParsedSegment;
    columnId?: string;
    customDateRange?: SimpleDateRange;
  };
  cardType?: CardType;
  decorationCardType?: WhyCardDecorationType;
  isCorrelatedAnomalies: boolean;
}
const HoverLine: React.FC<HoverLineProps> = ({
  name,
  data,
  xScale,
  hoverDispatch,
  graphLeftOffset,
  hideTooltip,
  showTooltip,
  alerts = [],
  debug = false,
  showLine = true,
  graphHeight = GRAPH_HEIGHT,
  graphVerticalBuffer = GRAPH_VERTICAL_BUFFER,
  graphWidth = GRAPH_WIDTH,
  bottomBuffer = false,
  profilesWithData,
  nudgeX = 0,
  allowBaselineComparison = false,
  cardType,
  decorationCardType,
  isCorrelatedAnomalies,
  navigationInformation,
}) => {
  const [touchIndex, setTouchIndex] = useState(-1);
  const [previousTimestamps, setPreviousTimestamps] = useState<number[]>([]);
  const [clickItemTimestamp, setClickItemTimestamp] = useState(-1);
  const [clickItemIndex, setClickItemIndex] = useState(-1);
  const [clickedAlerts, setClickedAlerts] = useState<AnalysisDataFragment[]>([]);
  const [index, setIndex] = useState<number | undefined>(undefined);
  const { goToIndex } = useContext(CardDataContext);
  const { deleteQueryParam } = useQueryParams();
  const [hoverTimestamp, setHoverTimestamp] = useRecoilState(hoverAtom);
  const [drawnMenuState, setDrawnMenuState] = useRecoilState(drawnMenuAtom);
  const [minDate, maxDate] = xScale.domain();
  const [{ activeCorrelatedAnomalies }] = useContext(AnalysisContext);
  const [clickPoint, setClickPoint] = useState<React.MouseEvent<SVGRectElement, MouseEvent> | null>(null);
  const { modelId, segment, featureId, outputName } = usePageTypeWithParams();
  const usedColumnId = navigationInformation?.columnId || featureId || outputName;
  const chartId = `${usedColumnId}--${name}`;
  const contextMenuOpened =
    clickItemTimestamp > 0 &&
    clickPoint !== null &&
    drawnMenuState.open &&
    drawnMenuState.component === 'HoverLine' &&
    drawnMenuState.chart === chartId;

  const usedResourceId = navigationInformation?.resourceId || modelId;
  const navToProfiles = useGraphProfileInteraction({
    modelId: usedResourceId,
    segment: navigationInformation?.segment || segment,
    featureId: usedColumnId,
    clickItemTimestamp,
    previousTimestamps,
    customDateRange: navigationInformation?.customDateRange,
  });

  const clearClick = useCallback(() => {
    setClickItemTimestamp(-1);
    setClickItemIndex(-1);
    setClickPoint(null);
    setDrawnMenuState({ open: false });
    hoverDispatch({ type: 'clear', value: '' });
  }, [setClickItemTimestamp, setClickPoint, setDrawnMenuState, hoverDispatch]);

  const baselineComparisonHandler = useCallback(() => {
    if (!activeCorrelatedAnomalies?.referenceFeature) {
      deleteQueryParam(ACTION_STATE_TAG);
    }
    goToIndex(clickItemIndex);
  }, [activeCorrelatedAnomalies?.referenceFeature, clickItemIndex, goToIndex, deleteQueryParam]);

  const setTrailingTimestamps = (previous: number) => {
    const prevTimestamp = previous !== undefined && previous > 0 ? data[previous - 1].dateInMillis : undefined;
    const prevTimestamp2 = previous !== undefined && previous > 1 ? data[previous - 2].dateInMillis : undefined;
    const otherStamps: number[] = [];

    if (prevTimestamp && profilesWithData.has(prevTimestamp)) otherStamps.push(prevTimestamp);
    if (prevTimestamp2 && profilesWithData.has(prevTimestamp2)) otherStamps.push(prevTimestamp2);

    setPreviousTimestamps(otherStamps);
  };

  const getNearestDatum = (
    x: number,
    sortedData: DatedData[] = data,
    low = 0,
    high: number = sortedData.length - 1,
  ): number => {
    // Binary search, slightly modified to narrow into the closest index to an approximate timestamp
    if (sortedData.length === 0) {
      return -1;
    }

    if (high === low) {
      return high;
    }

    if (high - low === 1) {
      // Find which point is closest
      if (Math.abs(xScale(sortedData[low].dateInMillis) - x) < Math.abs(xScale(sortedData[high].dateInMillis) - x)) {
        return low;
      }
      return high;
    }

    const mid = Math.floor((low + high) / 2);
    const dataX = xScale(sortedData[mid].dateInMillis);

    if (x < dataX) {
      return getNearestDatum(x, sortedData, low, mid);
    }
    if (x === dataX) {
      return mid;
    }
    return getNearestDatum(x, sortedData, mid, high);
  };

  const findAlertsWithTimestamp = (timestamp: number) => {
    return alerts.filter((a) => getAlertTime(a) === timestamp);
  };

  let datum: DatedData | undefined;
  let xPosition: number | undefined;

  if (
    hoverTimestamp.active &&
    typeof hoverTimestamp.timestamp === 'number' &&
    hoverTimestamp.timestamp >= minDate.getTime() &&
    hoverTimestamp.timestamp <= maxDate.getTime() &&
    (hoverTimestamp.chart !== name || hoverTimestamp.component !== 'HoverLine')
  ) {
    // Another chart is being hovered over, lets show the line
    const { timestamp } = hoverTimestamp;
    xPosition = xScale(timestamp) + nudgeX;
  } else if (index !== undefined && data[index]) {
    datum = data[index];
    const timestamp = datum.dateInMillis;
    xPosition = xScale(timestamp) + nudgeX;
  }

  const lineKey = `tooltip-line-${name}-${datum ? datum.dateInMillis : 'null'}`;

  const overlayKey = `overlay-bar-${name}-${datum ? datum.dateInMillis : 'null'}`;

  const fillColor = 'transparent';
  const lineBottom = bottomBuffer ? graphHeight - graphVerticalBuffer : graphHeight;
  const onCloseMenu = () => {
    setHoverTimestamp((curr) => ({ ...curr, active: false }));
    setIndex(undefined);
  };

  return (
    <Group
      onMouseLeave={() => {
        // setDrawnMenuState({ open: false });
        hoverDispatch({ type: 'clear', value: '' });
        hideTooltip();
      }}
      onClick={() => {
        if (drawnMenuState.open === true) {
          clearClick();
        }
      }}
      key={`group--${name}`}
    >
      <Line
        from={{ x: xPosition, y: graphVerticalBuffer }}
        to={{ x: xPosition, y: lineBottom }}
        strokeWidth={1}
        stroke={showLine && xPosition !== undefined ? Colors.chartPrimary : Colors.transparent}
        pointerEvents="none"
        key={lineKey}
      />
      <Bar
        x={0}
        y={0}
        fill={fillColor}
        stroke={debug ? '#0000ff77' : Colors.transparent}
        height={graphHeight}
        width={graphWidth}
        onClick={(event) => {
          const point = localPoint(event);
          if (point) {
            const i = getNearestDatum(point.x - graphLeftOffset);
            const nearest = data[i];
            if (nearest !== undefined) {
              const profileHasData = profilesWithData.has(nearest.dateInMillis);
              const profileAnomalies = findAlertsWithTimestamp(nearest.dateInMillis);
              if (!profileAnomalies?.length && !profileHasData) return;
              setTrailingTimestamps(i);
              setClickItemTimestamp(nearest.dateInMillis);
              setClickItemIndex(i);
              setClickPoint(event);
              setClickedAlerts(profileAnomalies);
              setDrawnMenuState({
                open: true,
                chart: chartId,
                component: 'HoverLine',
                isMissingDataPoint: !profileHasData,
              });
              hideTooltip();
            }
          }
        }}
        onMouseEnter={() => {
          if (drawnMenuState.open === true) {
            if (drawnMenuState.chart === chartId) {
              // Force other charts to close their drawn menu if mouse is over this chart.
              return;
            }
            setDrawnMenuState({ open: false });
          }
          hoverDispatch({ type: 'add', value: overlayKey });
        }}
        onMouseMove={(event) => {
          if (drawnMenuState.open === true) {
            return;
          }

          const { x, y } = localPoint(event) || { x: 0, y: 0 };
          const top = y;
          const left = x + graphLeftOffset; // tooltipLeft(x - graphLeftOffset);
          const nearest = getNearestDatum(x - graphLeftOffset);
          const timestamp = data[nearest] !== undefined ? data[nearest].dateInMillis : undefined;

          if (timestamp === undefined) {
            setHoverTimestamp({ ...hoverTimestamp, active: false });
            return;
          }

          const mouseY = event.clientY;
          const mouseX = event.clientX;

          if (showTooltip && clickItemTimestamp !== index) {
            showTooltip({ index: nearest, left, top, mouseY, mouseX });
            setIndex(nearest);

            if (hoverTimestamp.active === false || hoverTimestamp.timestamp !== timestamp) {
              setHoverTimestamp({ active: true, chart: name, component: 'HoverLine', timestamp });
            }
          }
        }}
        onMouseLeave={() => {
          if (drawnMenuState.open === true) {
            return;
          }
          hoverDispatch({ type: 'remove', value: overlayKey });
          setIndex(undefined);
          setHoverTimestamp({ ...hoverTimestamp, active: false });
          if (hideTooltip) {
            hideTooltip();
          }
        }}
        onTouchStart={() => {
          hoverDispatch({ type: 'add', value: overlayKey });
        }}
        onTouchMove={(event) => {
          const { x, y } = localPoint(event) || { x: 0, y: -1 };
          if (y < 0 || x < 0 || y > graphHeight - graphVerticalBuffer || x > graphWidth) {
            setTouchIndex(-1);
            hideTooltip();
            hoverDispatch({ type: 'remove', value: overlayKey });
            setHoverTimestamp({ ...hoverTimestamp, active: false });
            setIndex(undefined);
          }
        }}
        onTouchEnd={(event) => {
          const { x, y } = localPoint(event) || { x: 0, y: -1 };
          if (y === -1) {
            setTouchIndex(-1);
            hideTooltip();
            setIndex(undefined);
            setHoverTimestamp({ ...hoverTimestamp, active: false });
          } else if (touchIndex === index) {
            const top = y;
            const left = x + graphLeftOffset; // tooltipLeft(x - graphLeftOffset);
            const nearest = getNearestDatum(x - graphLeftOffset);
            const timestamp = data[nearest].dateInMillis;
            showTooltip({ index: nearest, left, top });
            setIndex(nearest);

            if (hoverTimestamp.timestamp !== timestamp) {
              setHoverTimestamp({ ...hoverTimestamp, active: true, chart: name, component: 'HoverLine', timestamp });
            }
          }
        }}
        onTouchCancel={() => {
          if (touchIndex === index) {
            hideTooltip();
            hoverDispatch({ type: 'remove', value: overlayKey });
            setIndex(undefined);
            setHoverTimestamp({ ...hoverTimestamp, active: false });
          }
        }}
      />
      {contextMenuOpened && (
        <MonitoringChartMenu
          opened={contextMenuOpened}
          isMissingDataPoint={!!drawnMenuState.isMissingDataPoint}
          profileBatchTimestamp={clickItemTimestamp}
          position={{
            x: (clickPoint?.pageX ?? 0) - 2,
            y: clickPoint?.pageY ?? 0,
            clientX: clickPoint?.clientX ?? 0,
            clientY: clickPoint?.clientY ?? 0,
          }}
          dataPointAnomalies={clickedAlerts}
          profilePageHandler={navToProfiles}
          baselineComparisonHandler={
            allowBaselineComparison && !isCorrelatedAnomalies ? baselineComparisonHandler : undefined
          }
          navigationInformation={navigationInformation}
          cardType={cardType}
          decorationCardType={decorationCardType}
          onClose={onCloseMenu}
          allowVisualizeCorrelatedAnomalies={!isCorrelatedAnomalies}
        />
      )}
      {debug && (
        <Line
          from={{ x: 0, y: 0 }}
          to={{ x: graphWidth, y: graphHeight }}
          strokeWidth={2}
          stroke={Colors.violet}
          strokeDasharray="5,2"
          pointerEvents="none"
        />
      )}
    </Group>
  );
};

interface SelectedProfileLineProps {
  xScale: ScaleTime<number, number>;
  height: number;
  yStart: number;
  profileTimestamp?: number;
}
export const SelectedProfileLine: React.FC<SelectedProfileLineProps> = ({
  xScale,
  height,
  yStart,
  profileTimestamp,
}) => {
  const selectedProfile = profileTimestamp ?? Number(getParam(SELECTED_TIMESTAMP) ?? 0);
  if (!selectedProfile) return null;
  return (
    <Line
      from={{ x: xScale(selectedProfile), y: yStart }}
      to={{ x: xScale(selectedProfile), y: height }}
      strokeWidth={1}
      stroke={Colors.yellow}
      pointerEvents="none"
      key={`selectedProfile--${selectedProfile}`}
    />
  );
};

export default HoverLine;

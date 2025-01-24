import { useState, useCallback, useContext, Fragment } from 'react';

import { ScaleTime } from 'd3-scale';
import { localPoint } from '@visx/event';
import { Bar, Line } from '@visx/shape';
import { HoverAction, HoverState } from 'hooks/useHover';
import { Colors } from '@whylabs/observatory-lib';
import { GRAPH_HEIGHT, GRAPH_VERTICAL_BUFFER, GRAPH_WIDTH } from 'ui/constants';
import { Group } from '@visx/group';
import { useDeepCompareMemo } from 'use-deep-compare';
import { makeStyles, createStyles } from '@material-ui/core';
import { useRecoilState } from 'recoil';
import { hoverAtom } from 'atoms/hoverAtom';
import { drawnMenuAtom } from 'atoms/drawnMenuAtom';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { CardType } from 'components/cards/why-card/types';
import { AnalysisContext } from 'pages/shared/AnalysisContext';
import { CardDataContext } from 'components/cards/why-card/CardDataContext';
import { useGraphProfileInteraction } from 'hooks/useGraphProfileInteraction';
import { AnalysisDataFragment } from 'generated/graphql';
import { ACTION_STATE_TAG, SELECTED_TIMESTAMP } from 'types/navTags';
import { AlertData, getAlertTime } from 'utils/createAlerts';
import { useQueryParams } from 'utils/queryUtils';
import { WhyCardDecorationType } from 'components/cards/why-card/WhyCardTexts';
import { ParsedSegment } from 'pages/page-types/pageUrlQuery';
import { SimpleDateRange } from 'utils/dateRangeUtils';
import { MonitoringChartMenu } from './monitoring-chart-menu/MonitoringChartMenu';

interface DatedData {
  dateInMillis: number;
}

const useStyles = makeStyles(() =>
  createStyles({
    clickity: {
      cursor: 'pointer',
    },
  }),
);

interface HoverBarsProps {
  name: string;
  data: DatedData[];
  alerts: AnalysisDataFragment[];
  xScale: ScaleTime<number, number>;
  hoverState: HoverState;
  hoverDispatch: React.Dispatch<HoverAction>;
  renderItems?: (index: number) => JSX.Element;
  hideTooltip: () => void;
  showTooltip: (tooltipArgs: { index: number; left: number; top: number; mouseY?: number; mouseX?: number }) => void;
  debug?: boolean;
  showBars?: boolean;
  showLine?: boolean;
  tooltipFlipThreshold?: number;
  tooltipFlipDisplacementRatio?: number;
  graphHeight?: number;
  graphVerticalBuffer?: number;
  graphWidth?: number;
  bottomBuffer?: boolean;
  tooltipNudge?: number;
  profilesWithData: Set<number>;
  expandProfileOption?: boolean;
  cardType?: CardType;
  decorationCardType?: WhyCardDecorationType;
  isCorrelatedAnomalies: boolean;
  navigationInformation?: {
    resourceId?: string;
    segment?: ParsedSegment;
    columnId?: string;
    customDateRange?: SimpleDateRange;
  };
}

const HoverBars: React.FC<HoverBarsProps> = ({
  name,
  data,
  alerts,
  xScale,
  hoverState,
  hoverDispatch,
  renderItems,
  hideTooltip,
  showTooltip,
  debug = false,
  showBars = false,
  showLine = true,
  graphHeight = GRAPH_HEIGHT,
  graphVerticalBuffer = GRAPH_VERTICAL_BUFFER,
  graphWidth = GRAPH_WIDTH,
  bottomBuffer = false,
  profilesWithData,
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
  const [clickPoint, setClickPoint] = useState<React.MouseEvent<SVGRectElement, MouseEvent> | null>(null);
  const [hoverTimestamp, setHoverTimestamp] = useRecoilState(hoverAtom);
  const { setQueryParam, deleteQueryParam } = useQueryParams();
  const { goToIndex } = useContext(CardDataContext);
  const [drawnMenuState, setDrawnMenuState] = useRecoilState(drawnMenuAtom);
  const { modelId, segment, featureId, outputName } = usePageTypeWithParams();
  const usedColumnId = navigationInformation?.columnId || featureId || outputName;
  const usedResourceId = navigationInformation?.resourceId || modelId;
  const chartId = `${usedColumnId}--${name}`;
  const [{ activeCorrelatedAnomalies }] = useContext(AnalysisContext);
  const contextMenuOpened =
    clickItemTimestamp > 0 &&
    !!clickPoint &&
    drawnMenuState.open &&
    drawnMenuState.component === 'HoverBars' &&
    drawnMenuState.chart === chartId;
  const styles = useStyles();
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
    hoverDispatch({ type: 'clear', value: '' });
    setDrawnMenuState({ open: false });
  }, [setClickItemTimestamp, setClickPoint, hoverDispatch, setDrawnMenuState, setClickItemIndex]);

  const baselineComparisonHandler = useCallback(() => {
    if (!activeCorrelatedAnomalies?.referenceFeature) {
      deleteQueryParam(ACTION_STATE_TAG);
      setQueryParam(SELECTED_TIMESTAMP, clickItemTimestamp.toString());
    }
    goToIndex(clickItemIndex);
  }, [
    activeCorrelatedAnomalies?.referenceFeature,
    goToIndex,
    clickItemIndex,
    deleteQueryParam,
    setQueryParam,
    clickItemTimestamp,
  ]);

  const alertsAlignedWithData: AlertData[][] = useDeepCompareMemo(() => {
    // Returns an array of the same length as data containing either undefined, or an alert associated with the first datapoint with a higher timestamp.
    if (alerts.length === 0) {
      return [];
    }

    alerts.sort((a, b) => getAlertTime(a) - getAlertTime(b));
    const aligned = new Array(data.length);
    let currentDataIndex = 1;
    const finalDate = data[data.length - 1].dateInMillis;

    if (data.length === 0) {
      return aligned;
    }

    alerts.forEach((a) => {
      const t = getAlertTime(a);
      if (t > finalDate || currentDataIndex >= data.length || t < data[0].dateInMillis) {
        return;
      }
      while (currentDataIndex <= data.length - 1 && t >= data[currentDataIndex].dateInMillis) {
        currentDataIndex += 1;
      }

      if (!aligned[currentDataIndex - 1]) {
        aligned[currentDataIndex - 1] = [a];
      } else {
        aligned[currentDataIndex - 1].push(a);
      }
    });
    return aligned;
  }, [alerts, data]);

  if (data.length === 0) {
    return null;
  }

  const getOverlayBarWidth = (datum: DatedData, index: number): number => {
    if (data.length === 1) {
      return graphWidth / 2;
    }
    if (index === 0) {
      return xScale(data[index + 1].dateInMillis) - xScale(datum.dateInMillis);
    }
    return xScale(datum.dateInMillis) - xScale(data[index - 1].dateInMillis);
  };

  function setTrailingTimestamps(index: number) {
    const prevTimestamp = index > 0 ? data[index - 1].dateInMillis : undefined;
    const prevTimestamp2 = index > 1 ? data[index - 2].dateInMillis : undefined;
    const otherStamps: number[] = [];

    if (prevTimestamp && profilesWithData.has(prevTimestamp)) otherStamps.push(prevTimestamp);
    if (prevTimestamp2 && profilesWithData.has(prevTimestamp2)) otherStamps.push(prevTimestamp2);

    setPreviousTimestamps(otherStamps);
  }

  const findAlertsWithTimestamp = (timestamp: number) => {
    return alerts.filter((a) => getAlertTime(a) === timestamp);
  };

  const onCloseMenu = () => {
    setHoverTimestamp((curr) => ({ ...curr, active: false }));
    setTouchIndex(-1);
  };

  return (
    <Group
      onMouseLeave={() => {
        // setDrawnMenuState({ open: false });
        hoverDispatch({ type: 'clear', value: '' });
        hideTooltip();
      }}
      onMouseEnter={() => hoverDispatch({ type: 'clear', value: '' })}
      onClick={() => {
        if (drawnMenuState.open) {
          clearClick();
        }
      }}
      key={`group--${name}`}
    >
      {data.map((datum, index) => {
        const xPosition = xScale(datum.dateInMillis);
        const overlayBarwidth = getOverlayBarWidth(datum, index);
        const offset = overlayBarwidth / 2;
        const overlayKey = `overlay-bar-${name}-${datum.dateInMillis}`;
        const lineKey = `tooltip-line-${name}-${datum.dateInMillis}`;
        const iconSide = graphVerticalBuffer - 2;
        const iconPosition = xPosition;
        const hasAlert = alertsAlignedWithData[index];
        const fallbackColor = debug ? '#ff000055' : Colors.transparent;
        const fillColor = hoverState[overlayKey] && showBars ? `${Colors.violet}33` : fallbackColor;
        const lineBottom = bottomBuffer ? graphHeight - graphVerticalBuffer : graphHeight;
        return (
          <Fragment key={overlayKey}>
            <Line
              from={{ x: xPosition, y: graphVerticalBuffer }}
              to={{ x: xPosition, y: lineBottom }}
              strokeWidth={1}
              stroke={
                showLine &&
                (hoverState[overlayKey] ||
                  (hoverTimestamp.active === true && hoverTimestamp.timestamp === datum.dateInMillis))
                  ? Colors.chartPrimary
                  : Colors.transparent
              }
              pointerEvents="none"
              key={lineKey}
            />
            {renderItems && hoverState[overlayKey] && renderItems(index)}
            <Bar
              x={xPosition - offset}
              y={0}
              fill={fillColor}
              stroke={debug ? '#0000ff77' : Colors.transparent}
              height={graphHeight}
              width={overlayBarwidth}
              onClick={(event) => {
                const profileHasData = profilesWithData.has(datum.dateInMillis);
                const profileAnomalies = findAlertsWithTimestamp(datum.dateInMillis);
                if (!profileHasData && !profileAnomalies?.length) {
                  return;
                }

                setTrailingTimestamps(index);
                setClickItemIndex(index);
                setClickItemTimestamp(datum.dateInMillis);
                setClickPoint(event);
                setClickedAlerts(profileAnomalies);
                setDrawnMenuState({
                  open: true,
                  chart: chartId,
                  component: 'HoverBars',
                  isMissingDataPoint: !profileHasData,
                });

                hideTooltip?.();
              }}
              onMouseEnter={() => {
                if (drawnMenuState.open === true) {
                  if (drawnMenuState.chart === chartId) {
                    return;
                  }
                  // Force other charts to close their drawn menu if mouse is over this chart.
                  setDrawnMenuState({ open: false });
                }
                hoverDispatch({ type: 'add', value: overlayKey });
              }}
              onMouseMove={(event) => {
                const { y, x } = localPoint(event) || { x: 0, y: 0 };
                const top = y;
                const left = x;
                if (showTooltip && clickItemTimestamp !== index) {
                  const mouseY = event.clientY;
                  const mouseX = event.clientX;
                  showTooltip({ index, left, top, mouseY, mouseX });
                }
                const timestamp = datum.dateInMillis;
                if (hoverTimestamp.active === false || hoverTimestamp.timestamp !== timestamp) {
                  setHoverTimestamp({
                    ...hoverTimestamp,
                    active: true,
                    chart: name,
                    component: 'HoverBars',
                    timestamp,
                  });
                }
              }}
              onMouseLeave={() => {
                if (drawnMenuState.open === true) {
                  return;
                }
                hoverDispatch({ type: 'remove', value: overlayKey });
                if (hideTooltip) {
                  hideTooltip();
                }
                setHoverTimestamp({ ...hoverTimestamp, active: false });
              }}
              onTouchStart={() => {
                setTouchIndex(index);
                hoverDispatch({ type: 'add', value: overlayKey });
              }}
              onTouchMove={(event) => {
                const { x, y } = localPoint(event) || { x: 0, y: -1 };
                if (y < 0 || x < 0 || y > graphHeight - graphVerticalBuffer || x > overlayBarwidth) {
                  setTouchIndex(-1);
                  hideTooltip();
                  hoverDispatch({ type: 'remove', value: overlayKey });
                }
              }}
              onTouchEnd={(event) => {
                const { y, x } = localPoint(event) || { x: 0, y: -1 };
                if (y === -1) {
                  setTouchIndex(-1);
                  hideTooltip();
                } else if (touchIndex === index) {
                  const top = y;
                  const left = x;
                  const mouseY = event.changedTouches[0].clientY;
                  const mouseX = event.changedTouches[0].clientX;
                  showTooltip({ index, left, top, mouseY, mouseX });
                }
              }}
              onTouchCancel={() => {
                if (touchIndex === index) {
                  hideTooltip();
                  hoverDispatch({ type: 'remove', value: overlayKey });
                }
              }}
            />
            {hasAlert && (
              <>
                <Bar
                  x={iconPosition - iconSide / 2}
                  y={2}
                  className={hasAlert ? styles.clickity : ''}
                  fill={Colors.transparent}
                  height={iconSide - 2}
                  width={iconSide}
                  onClick={(event) => {
                    const profileAnomalies = findAlertsWithTimestamp(datum.dateInMillis);
                    if (!profileAnomalies) {
                      return;
                    }
                    const otherStamps: number[] = [];
                    if (index > 0) {
                      otherStamps.push(data[index - 1].dateInMillis);
                    }
                    if (index > 1) {
                      otherStamps.push(data[index - 2].dateInMillis);
                    }

                    setPreviousTimestamps(otherStamps);
                    setClickItemTimestamp(datum.dateInMillis);
                    setClickPoint(event);
                    setClickedAlerts(profileAnomalies);
                    hideTooltip?.();
                  }}
                />
              </>
            )}
          </Fragment>
        );
      })}
      {contextMenuOpened && (
        <MonitoringChartMenu
          isMissingDataPoint={!!drawnMenuState.isMissingDataPoint}
          opened={contextMenuOpened}
          profileBatchTimestamp={clickItemTimestamp}
          position={{
            x: (clickPoint?.pageX ?? 0) - 2,
            y: clickPoint?.pageY ?? 0,
            clientX: clickPoint?.clientX ?? 0,
            clientY: clickPoint?.clientY ?? 0,
          }}
          dataPointAnomalies={clickedAlerts}
          profilePageHandler={navToProfiles}
          baselineComparisonHandler={isCorrelatedAnomalies ? undefined : baselineComparisonHandler}
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

export default HoverBars;

import { useState, useMemo, Fragment, useCallback, useContext } from 'react';

import { ScaleBand, ScaleTime } from 'd3-scale';
import { localPoint } from '@visx/event';
import { Bar, Line } from '@visx/shape';
import { HoverAction } from 'hooks/useHover';
import { Colors } from '@whylabs/observatory-lib';
import ErrorOutlineIcon from '@material-ui/icons/ErrorOutline';
import { GRAPH_HEIGHT, GRAPH_WIDTH } from 'ui/constants';
import { Group } from '@visx/group';
import { useDeepCompareMemo } from 'use-deep-compare';
import { makeStyles, createStyles } from '@material-ui/core';
import { hoverAtom } from 'atoms/hoverAtom';
import { drawnMenuAtom } from 'atoms/drawnMenuAtom';
import { AlertData, getAlertTime } from 'utils/createAlerts';
import { useAdHoc } from 'atoms/adHocAtom';
import { useRecoilState } from 'recoil';
import { AnalysisDataFragment, ThresholdAnalysisDataFragment } from 'generated/graphql';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { CardType } from 'components/cards/why-card/types';
import { useGraphProfileInteraction } from 'hooks/useGraphProfileInteraction';
import { WhyCardDecorationType } from 'components/cards/why-card/WhyCardTexts';
import { ParsedSegment } from 'pages/page-types/pageUrlQuery';
import { ACTION_STATE_TAG } from 'types/navTags';
import { AnalysisContext } from 'pages/shared/AnalysisContext';
import { useQueryParams } from 'utils/queryUtils';
import { CardDataContext } from 'components/cards/why-card/CardDataContext';
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

interface AlertIconsProps {
  name: string;
  data: DatedData[];
  alerts: (AnalysisDataFragment | ThresholdAnalysisDataFragment)[];
  xScale: ScaleTime<number, number> | ScaleBand<number>;
  hoverDispatch: React.Dispatch<HoverAction>;
  hideTooltip?: () => void;
  showTooltip?: (tooltipArgs: { index: number; left: number; top: number; mouseX?: number; mouseY?: number }) => void;
  debug?: boolean;
  graphHeight?: number;
  graphVerticalBuffer?: number;
  profilesWithData: Set<number>;
  graphWidth?: number;
  cardType?: CardType;
  decorationCardType?: WhyCardDecorationType;
  isCorrelatedAnomalies: boolean;
  offset?: number;
  hackToFixAlertInLLMS?: boolean;
  allowBaselineComparison?: boolean;
  navigationInformation?: {
    resourceId?: string;
    segment?: ParsedSegment;
    columnId?: string;
    customDateRange?: SimpleDateRange;
  };
}

const AlertIcons: React.FC<AlertIconsProps> = ({
  name,
  data,
  alerts,
  xScale,
  hoverDispatch,
  hideTooltip,
  showTooltip,
  debug = false,
  offset = 0,
  graphHeight = GRAPH_HEIGHT,
  graphWidth = GRAPH_WIDTH,
  cardType,
  decorationCardType,
  isCorrelatedAnomalies,
  hackToFixAlertInLLMS = false,
  profilesWithData,
  navigationInformation,
  allowBaselineComparison,
}) => {
  const [previousTimestamps, setPreviousTimestamps] = useState<number[]>([]);
  const [clickItemTimestamp, setClickItemTimestamp] = useState(-1);
  const [clickItemIndex, setClickItemIndex] = useState(-1);
  const [clickedAlerts, setClickedAlerts] = useState<(AnalysisDataFragment | ThresholdAnalysisDataFragment)[]>([]);
  const [clickPoint, setClickPoint] = useState<React.MouseEvent<SVGRectElement, MouseEvent> | null>(null);
  const [{ activeCorrelatedAnomalies }] = useContext(AnalysisContext);
  const { goToIndex } = useContext(CardDataContext);
  const { deleteQueryParam } = useQueryParams();
  const [hoverTimestamp, setHoverTimestamp] = useRecoilState(hoverAtom);
  const [drawnMenuState, setDrawnMenuState] = useRecoilState(drawnMenuAtom);
  const [adHocRunId] = useAdHoc();
  const { modelId, segment, featureId, outputName } = usePageTypeWithParams();
  const usedColumnId = navigationInformation?.columnId || featureId || outputName;
  const usedResourceId = navigationInformation?.resourceId || modelId;
  const chartId = `${usedColumnId}--${name}`;
  const contextMenuOpened =
    clickItemTimestamp > 0 &&
    !!clickPoint &&
    drawnMenuState.open &&
    drawnMenuState.component === 'AlertIcons' &&
    drawnMenuState.chart === chartId;

  const styles = useStyles();
  const errorIconStyleObject = useMemo(() => ({ color: Colors.red }), []);
  const falseAlarmIconStyleObject = useMemo(() => ({ color: Colors.brandSecondary400 }), []);
  const adHocIconStyleObject = useMemo(() => ({ color: Colors.chartOrange }), []);

  const navToProfiles = useGraphProfileInteraction({
    modelId: usedResourceId,
    segment: navigationInformation?.segment || segment,
    featureId: usedColumnId,
    clickItemTimestamp,
    previousTimestamps,
    customDateRange: navigationInformation?.customDateRange,
  });

  const baselineComparisonHandler = useCallback(() => {
    if (!activeCorrelatedAnomalies?.referenceFeature) {
      deleteQueryParam(ACTION_STATE_TAG);
    }
    goToIndex(clickItemIndex);
  }, [activeCorrelatedAnomalies?.referenceFeature, clickItemIndex, goToIndex, deleteQueryParam]);

  const alertsAlignedWithData: (AlertData | AnalysisDataFragment | ThresholdAnalysisDataFragment)[][] =
    useDeepCompareMemo(() => {
      // Returns an array of the same length as data containing an array of alerts associated with the first datapoint with a higher timestamp.
      alerts.sort((a, b) => {
        const timea = getAlertTime(a);
        const timeb = getAlertTime(b);
        if (timea === null || timeb === null) {
          return 0;
        }
        return timea - timeb;
      });

      const aligned = new Array(data.length);
      let currentDataIndex = 1;

      if (data.length === 0) {
        return aligned;
      }
      const finalDate = data[data.length - 1].dateInMillis;

      alerts.forEach((a) => {
        const t = getAlertTime(a);
        if (t > finalDate || (currentDataIndex >= data.length && !hackToFixAlertInLLMS) || t < data[0].dateInMillis) {
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
  const clearClick = () => {
    setClickItemTimestamp(-1);
    setClickItemIndex(-1);
    setClickPoint(null);
    setDrawnMenuState({ open: false });
    hoverDispatch({ type: 'clear', value: '' });
  };

  const findAlertsWithTimestamp = (timestamp: number) => {
    return alerts.filter((a) => getAlertTime(a) === timestamp);
  };

  const alertStyling = (a: (AlertData | AnalysisDataFragment | ThresholdAnalysisDataFragment)[]) => {
    const falseAlarms = a.find((alert) => {
      if ('isFalseAlarm' in alert && alert.isFalseAlarm) {
        return true;
      }
      return false;
    });

    const adHocRuns = a.find((alert) => {
      if ('runId' in alert && adHocRunId && alert.runId === adHocRunId) {
        return true;
      }
      return false;
    });

    if (falseAlarms) {
      return falseAlarmIconStyleObject;
    }
    if (adHocRuns) {
      return adHocIconStyleObject;
    }
    return errorIconStyleObject;
  };

  return (
    <Group
      onClick={() => {
        if (drawnMenuState.open === true) {
          clearClick();
        }
      }}
    >
      {data.map((datum, index) => {
        const xPosition = xScale(datum.dateInMillis);
        const alertKey = `alert-icon-${name}-${datum.dateInMillis}`;
        const iconSide = 20;
        const iconPosition = xPosition ?? 0;
        const hasAlert = alertsAlignedWithData[index];
        return (
          <Fragment key={alertKey}>
            {hasAlert && (
              <>
                <ErrorOutlineIcon
                  x={iconPosition - iconSide / 2 + offset}
                  y={0}
                  style={alertStyling(hasAlert)}
                  height={iconSide}
                  width={iconSide}
                />
                <Bar
                  x={iconPosition - iconSide / 2 + offset}
                  y={2}
                  className={hasAlert ? styles.clickity : ''}
                  fill={Colors.transparent}
                  height={iconSide - 2}
                  width={iconSide}
                  onClick={(event) => {
                    const clickedPoint = localPoint(event);
                    // Snap x value to the alert icon
                    if (clickedPoint) {
                      clickedPoint.x = xScale(datum.dateInMillis) ?? 0;
                    }
                    const profileHasData = profilesWithData.has(datum.dateInMillis);
                    const profilesAnomalies = findAlertsWithTimestamp(datum.dateInMillis);
                    if (!profilesAnomalies?.length && !profileHasData) {
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
                    setClickItemIndex(index);
                    setClickPoint(event);
                    setClickedAlerts(profilesAnomalies);
                    setDrawnMenuState({
                      open: true,
                      chart: chartId,
                      component: 'AlertIcons',
                      isMissingDataPoint: !profileHasData,
                    });

                    hideTooltip?.();
                  }}
                  onMouseEnter={() => {
                    if (drawnMenuState.open === true) {
                      if (drawnMenuState.chart !== chartId) {
                        // Force other charts to close their drawn menu if mouse is over this chart.
                        setDrawnMenuState({ open: false });
                      }
                    }
                  }}
                  onMouseMove={(event) => {
                    if (drawnMenuState.open === true) {
                      return;
                    }

                    const timestamp = datum.dateInMillis;
                    if (hoverTimestamp.active === false || hoverTimestamp.timestamp !== timestamp) {
                      setHoverTimestamp({
                        ...hoverTimestamp,
                        active: true,
                        chart: name,
                        component: 'AlertIcons',
                        timestamp,
                      });
                    }

                    if (showTooltip) {
                      const mouseX = event.clientX;
                      const mouseY = event.clientY;
                      if (clickPoint === null) {
                        const x = iconPosition + iconSide;
                        showTooltip({ index, left: x, top: iconSide / 2, mouseX, mouseY });
                      } else if (hideTooltip) {
                        hideTooltip();
                      }
                    }
                  }}
                  onMouseLeave={() => {
                    if (drawnMenuState.open === true) {
                      return;
                    }
                    setHoverTimestamp({ ...hoverTimestamp, active: false });
                    if (hideTooltip) {
                      hideTooltip();
                    }
                    hoverDispatch({ type: 'clear', value: '' });
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
          cardType={cardType}
          navigationInformation={navigationInformation}
          decorationCardType={decorationCardType}
          allowVisualizeCorrelatedAnomalies={!isCorrelatedAnomalies}
          baselineComparisonHandler={
            allowBaselineComparison && !isCorrelatedAnomalies ? baselineComparisonHandler : undefined
          }
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

export default AlertIcons;

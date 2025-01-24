import { DatedKeyedQuantileSummary } from 'utils/createDatedQuantiles';
import { AnalysisDataFragment, TimePeriod } from 'generated/graphql';
import { Colors, stringMax } from '@whylabs/observatory-lib';
import { defaultStyles, TooltipWithBounds, Portal } from '@visx/tooltip';
import ErrorOutlineIcon from '@material-ui/icons/ErrorOutline';
import { timeLong } from 'utils/dateUtils';
import { AlertData, anomalyTooltipText, createFrequentStringsAnomalyText, isAnalysisData } from 'utils/createAlerts';
import { ChartStylesOption, selectChartStyle, useChartStyles } from 'hooks/useChartStyles';
import { friendlyFormat } from 'utils/numberUtils';
import { useAdHoc } from 'atoms/adHocAtom';
import { useCommonStyles } from 'hooks/useCommonStyles';
import { WhyLabsText } from 'components/design-system';
import { useRecoilState } from 'recoil';
import { useCallback, useContext, useState } from 'react';
import { drawnMenuAtom } from 'atoms/drawnMenuAtom';
import { areAllDefinedAndNonNull } from 'utils';
import { DatedFrequentItem } from 'utils/createDatedFrequentItems';
import { DistanceEvent } from 'hooks/useFeatureDistance';
import { ScaleOrdinal } from 'd3-scale';
import { AnalysisContext } from 'pages/shared/AnalysisContext';
import { useResizeObserver } from '@mantine/hooks';
import { LegendShape, renderLegendItem } from '../vizutils/shapeUtils';
import { ExplainIconStyle, explainIconStyle, graphSnappyTooltipStyles } from '../vizutils/styleUtils';
import { StaleDataTooltipSection } from '../components/StaleDataTooltipSection';

const tooltipStyles = {
  ...defaultStyles,
  ...graphSnappyTooltipStyles,
};

export interface AnalysisTooltipItem {
  shape: LegendShape;
  color: string;
  lines: {
    description: React.ReactNode;
    value: React.ReactNode;
  }[];
}

type StaleDataProps = {
  analysisTimestamp: number;
  lastUploadTimestamp: number;
  batchFrequency: TimePeriod;
};

export interface AnalysisTooltipDatum {
  timestamp: string;
  lastUploadTimestamp?: string;
  isFalseAnomaly: boolean;
  explanationIconStyle: ExplainIconStyle;
  explanationTooltipStyle: ChartStylesOption;
  explanation: string[] | null;
  staleDataInfo?: StaleDataProps;
  noDataAvailable: boolean;
  analyzerId: string | null;
  monitorId?: string;
  monitorName?: string;
  items: AnalysisTooltipItem[];
}

interface MountFrequentItemsTooltipHookProps {
  batchFrequency: TimePeriod;
  filteredAnalysis: AnalysisDataFragment[];
  filteredCategories: string[];
  algorithmName: string;
  colorScale: ScaleOrdinal<string, string>;
}

type MountFrequentItemsTooltipProps = {
  event: DistanceEvent | null;
  item: DatedFrequentItem | null;
  timestamp: number | undefined;
  lastUploadTimestamp?: number;
};
export const useMountFrequentItemsTooltip = ({
  algorithmName,
  filteredCategories,
  filteredAnalysis,
  batchFrequency,
  colorScale,
}: MountFrequentItemsTooltipHookProps): ((props: MountFrequentItemsTooltipProps) => AnalysisTooltipDatum) => {
  const { classes: chartStyles } = useChartStyles();
  const [adHocRunId] = useAdHoc();

  const [{ activeCorrelatedAnomalies }] = useContext(AnalysisContext);
  return useCallback(
    ({ item, timestamp, lastUploadTimestamp }): AnalysisTooltipDatum => {
      const explanation: string[] = [];
      let explainedAlert: AlertData | AnalysisDataFragment | undefined;
      const usedTimestamp = timestamp ?? 0;
      const foundEvent = filteredAnalysis.find((an) => an?.datasetTimestamp === usedTimestamp);
      let analyzerId: string | null = null;
      let monitorId: string | undefined;
      let monitorName: string | undefined;
      if (isAnalysisData(foundEvent)) {
        const driftText = anomalyTooltipText(foundEvent, adHocRunId);
        if (foundEvent.analyzerType === 'drift' && driftText) {
          explanation.push(driftText);
        }
        if (foundEvent.analyzerType === 'frequent_string_comparison') {
          explanation.push(...createFrequentStringsAnomalyText(foundEvent));
        }
        explainedAlert = foundEvent;
        analyzerId = foundEvent.analyzerId ?? null;
        monitorId = foundEvent.monitorIds?.[0];
        monitorName = foundEvent.monitorDisplayName ?? undefined;
      }
      let staleDataInfo: StaleDataProps | undefined;
      if (lastUploadTimestamp && foundEvent && foundEvent.creationTimestamp) {
        staleDataInfo = { lastUploadTimestamp, analysisTimestamp: foundEvent.creationTimestamp, batchFrequency };
      }
      const items: AnalysisTooltipItem[] = !item
        ? []
        : [...filteredCategories].reverse().map((vc) => {
            const catItem = item!.frequentItems.filter((fi) => fi.value === vc);
            const catCount = catItem.length > 0 ? Math.round(catItem[0].estimate).toLocaleString() : '0';
            return {
              shape: 'box',
              color: colorScale(vc),
              lines: [
                {
                  description: (
                    <WhyLabsText className={chartStyles.squishyTooltipBody}>{stringMax(vc, 40)}:</WhyLabsText>
                  ),
                  value: <WhyLabsText className={chartStyles.squishyTooltipBody}>{catCount}</WhyLabsText>,
                },
              ],
            };
          });
      const isCorrelatedSection = !!activeCorrelatedAnomalies?.referenceFeature;
      if (foundEvent?.metric === 'FREQUENT_ITEMS') {
        items.unshift({
          shape: isCorrelatedSection ? 'empty' : 'line',
          color: Colors.chartPurple,
          lines: [
            {
              description: <WhyLabsText className={chartStyles.analysisTooltipBody}>{algorithmName}:</WhyLabsText>,
              value: (
                <WhyLabsText className={chartStyles.analysisTooltipBody}>
                  {friendlyFormat(foundEvent.drift_metricValue, 3) || '-'}
                </WhyLabsText>
              ),
            },
          ],
        });
      }
      return {
        timestamp: timeLong(usedTimestamp, batchFrequency),
        explanation,
        explanationIconStyle: explainIconStyle(explainedAlert, adHocRunId),
        explanationTooltipStyle: selectChartStyle(explainedAlert, adHocRunId),
        noDataAvailable: !item,
        isFalseAnomaly: explainedAlert ? !!('isFalseAlarm' in explainedAlert && explainedAlert.isFalseAlarm) : false,
        analyzerId,
        monitorId,
        monitorName,
        staleDataInfo,
        items,
      };
    },
    [
      activeCorrelatedAnomalies?.referenceFeature,
      adHocRunId,
      algorithmName,
      batchFrequency,
      chartStyles.analysisTooltipBody,
      chartStyles.squishyTooltipBody,
      colorScale,
      filteredAnalysis,
      filteredCategories,
    ],
  );
};

interface MountQuantileTooltipHookProps {
  batchFrequency: TimePeriod;
  filteredAnalysis: AnalysisDataFragment[];
  algorithmName: string;
}

type MountQuantileTooltipProps = {
  event: AnalysisDataFragment | null;
  item: DatedKeyedQuantileSummary | null;
  timestamp: number | undefined;
  lastUploadTimestamp?: number;
};

export const useMountQuantilesTooltip = ({
  algorithmName,
  filteredAnalysis,
  batchFrequency,
}: MountQuantileTooltipHookProps): ((props: MountQuantileTooltipProps) => AnalysisTooltipDatum) => {
  const { classes: chartStyles } = useChartStyles();
  const [adHocRunId] = useAdHoc();
  const getRange = (datum: DatedKeyedQuantileSummary | null, startKey: string, stopKey = '') => {
    if (!datum) {
      return null;
    }
    const startIndex = datum.quantiles.bins.indexOf(startKey);
    const stopIndex = datum.quantiles.bins.indexOf(stopKey);
    let startValue = -1;
    let stopValue = -1;
    if (startIndex > -1) {
      startValue = datum.quantiles.counts[startIndex];
    } else {
      return null;
    }
    if (stopIndex > -1) {
      stopValue = datum.quantiles.counts[stopIndex];
    }
    return [startValue, stopValue];
  };

  return useCallback(
    ({ item, timestamp, lastUploadTimestamp }): AnalysisTooltipDatum => {
      const usedTimestamp = timestamp ?? 0;
      const outerRange = getRange(item, '5%', '95%');
      const innerRange = getRange(item, '25%', '75%');
      const middleRange = getRange(item, '50%');
      const maxRange = getRange(item, '100%');
      const minRange = getRange(item, '0%');

      const analysisResult = filteredAnalysis.find((an) => an?.datasetTimestamp === usedTimestamp);
      let analyzerId: string | null = null;
      let monitorId: string | undefined;
      let monitorName: string | undefined;
      const explanationArray: string[] = [];

      if (!!analysisResult && isAnalysisData(analysisResult) && analysisResult.analyzerType === 'drift') {
        const text = anomalyTooltipText(analysisResult, adHocRunId);
        if (text) {
          explanationArray.push(text);
        }
        analyzerId = analysisResult.analyzerId ?? null;
        monitorId = analysisResult.monitorIds?.[0] ?? undefined;
        monitorName = analysisResult.monitorDisplayName ?? undefined;
      }

      let staleDataInfo: StaleDataProps | undefined;
      if (lastUploadTimestamp && analysisResult && analysisResult.creationTimestamp) {
        staleDataInfo = { lastUploadTimestamp, analysisTimestamp: analysisResult.creationTimestamp, batchFrequency };
      }
      const tooltipBaseData: AnalysisTooltipDatum = {
        timestamp: timeLong(usedTimestamp, batchFrequency),
        lastUploadTimestamp: lastUploadTimestamp ? timeLong(lastUploadTimestamp, batchFrequency) : undefined,
        explanation: explanationArray.length > 0 ? explanationArray : null,
        explanationIconStyle: explainIconStyle(analysisResult, adHocRunId),
        explanationTooltipStyle: selectChartStyle(analysisResult, adHocRunId),
        noDataAvailable: !item,
        isFalseAnomaly: analysisResult ? !!('isFalseAlarm' in analysisResult && analysisResult.isFalseAlarm) : false,
        analyzerId,
        monitorId,
        monitorName,
        staleDataInfo,
        items: [],
      };

      if (typeof analysisResult?.drift_metricValue === 'number') {
        tooltipBaseData.items.push({
          shape: 'line',
          color: Colors.chartPurple,
          lines: [
            {
              description: <WhyLabsText className={chartStyles.analysisTooltipBody}>{algorithmName}:</WhyLabsText>,
              value: (
                <WhyLabsText className={chartStyles.analysisTooltipBody}>
                  {(analysisResult as AnalysisDataFragment)?.metric === 'HISTOGRAM'
                    ? friendlyFormat(analysisResult.drift_metricValue, 3)
                    : 'no data available'}
                </WhyLabsText>
              ),
            },
          ],
        });
      }
      if (middleRange) {
        tooltipBaseData.items.push({
          shape: 'line',
          color: Colors.brandSecondary900,
          lines: [
            {
              description: <WhyLabsText className={chartStyles.analysisTooltipBody}>Median:</WhyLabsText>,
              value: (
                <WhyLabsText className={chartStyles.analysisTooltipBody}>
                  {friendlyFormat(middleRange[0], 2)}
                </WhyLabsText>
              ),
            },
          ],
        });
      }
      if (maxRange) {
        tooltipBaseData.items.push({
          shape: 'line',
          color: Colors.chartYellow,
          lines: [
            {
              description: <WhyLabsText className={chartStyles.analysisTooltipBody}>Max:</WhyLabsText>,
              value: (
                <WhyLabsText className={chartStyles.analysisTooltipBody}>{friendlyFormat(maxRange[0], 2)}</WhyLabsText>
              ),
            },
          ],
        });
      }
      if (minRange) {
        tooltipBaseData.items.push({
          shape: 'line',
          color: Colors.chartYellow,
          lines: [
            {
              description: <WhyLabsText className={chartStyles.analysisTooltipBody}>Min:</WhyLabsText>,
              value: (
                <WhyLabsText className={chartStyles.analysisTooltipBody}>{friendlyFormat(minRange[0], 2)}</WhyLabsText>
              ),
            },
          ],
        });
      }
      if (outerRange) {
        tooltipBaseData.items.push({
          shape: 'box',
          color: Colors.brandPrimary100,
          lines: [
            {
              description: <WhyLabsText className={chartStyles.squishyTooltipBody}>95th percentile:</WhyLabsText>,
              value: (
                <WhyLabsText className={chartStyles.squishyTooltipBody}>{friendlyFormat(outerRange[1], 2)}</WhyLabsText>
              ),
            },
            {
              description: <WhyLabsText className={chartStyles.squishyTooltipBody}>5th percentile:</WhyLabsText>,
              value: (
                <WhyLabsText className={chartStyles.squishyTooltipBody}>{friendlyFormat(outerRange[0], 2)}</WhyLabsText>
              ),
            },
          ],
        });
      }
      if (innerRange) {
        tooltipBaseData.items.push({
          shape: 'box',
          color: Colors.brandPrimary500,
          lines: [
            {
              description: <WhyLabsText className={chartStyles.squishyTooltipBody}>75th percentile:</WhyLabsText>,
              value: (
                <WhyLabsText className={chartStyles.squishyTooltipBody}>{friendlyFormat(innerRange[1], 2)}</WhyLabsText>
              ),
            },
            {
              description: <WhyLabsText className={chartStyles.squishyTooltipBody}>25th percentile:</WhyLabsText>,
              value: (
                <WhyLabsText className={chartStyles.squishyTooltipBody}>{friendlyFormat(innerRange[0], 2)}</WhyLabsText>
              ),
            },
          ],
        });
      }

      return tooltipBaseData;
    },
    [
      adHocRunId,
      algorithmName,
      batchFrequency,
      chartStyles.analysisTooltipBody,
      chartStyles.squishyTooltipBody,
      filteredAnalysis,
    ],
  );
};

type AnalysisTooltipProps = {
  tooltipData: AnalysisTooltipDatum;
  tooltipTop?: number;
  tooltipLeft?: number;
  tooltipOpen: boolean;
};

const borderMapper = new Map<ChartStylesOption, React.CSSProperties>([
  ['tooltipError', { border: `1px solid ${Colors.red}` }],
  ['tooltipAdHoc', { border: `1px solid ${Colors.orange}` }],
]);
export const AnalysisChartTooltip: React.FC<AnalysisTooltipProps> = ({
  tooltipData: {
    timestamp,
    isFalseAnomaly,
    explanation,
    analyzerId,
    items,
    staleDataInfo,
    explanationIconStyle,
    explanationTooltipStyle,
    noDataAvailable,
    monitorId,
    monitorName,
  },
  tooltipTop,
  tooltipLeft,
  tooltipOpen,
}) => {
  const { classes: styles, cx } = useCommonStyles();
  const [ref, rect] = useResizeObserver();
  const { classes: chartStyles } = useChartStyles();
  const [adHocRunId] = useAdHoc();
  const extraBorderStyles = borderMapper.get(explanationTooltipStyle) ?? {};
  const [drawnMenuState] = useRecoilState(drawnMenuAtom);
  const [flipState, setFlipState] = useState(false);
  if (drawnMenuState.open || !tooltipOpen || !areAllDefinedAndNonNull(tooltipLeft, tooltipTop, items)) {
    return null;
  }

  const mapItem = ({ description, value }: AnalysisTooltipItem['lines'][number]) => {
    return (
      <div className={chartStyles.tooltipFlexField} key={`tooltip-line--${Math.random()}`}>
        {description}
        {value}
      </div>
    );
  };

  const renderItems = (lines: AnalysisTooltipItem['lines']) => {
    return <div className={styles.flexColumn}>{lines.map(mapItem)}</div>;
  };

  const renderStaleDataExplanation = () => {
    return (
      <StaleDataTooltipSection
        lastUploadTimestamp={staleDataInfo?.lastUploadTimestamp}
        analysisTimestamp={staleDataInfo?.analysisTimestamp}
        batchFrequency={staleDataInfo?.batchFrequency}
      />
    );
  };

  const verticalFlip = rect.bottom > document?.body?.getBoundingClientRect()?.bottom - 10;
  if (!flipState && verticalFlip) {
    setFlipState(true);
  }

  const renderMonitorAndAnalyzerInformation = () => {
    const monitorInfo = monitorName || monitorId;
    if (!monitorInfo && !analyzerId) return null;
    const renderInfo = (key: string, value: string) => (
      <div className={styles.tooltipRow}>
        {renderLegendItem(Colors.transparent, '', '', 'empty')}
        <WhyLabsText className={cx(chartStyles[explanationTooltipStyle], styles.breakWord)}>
          {key} {value}
        </WhyLabsText>
      </div>
    );

    return (
      <>
        {monitorInfo && renderInfo('Monitor:', monitorInfo)}
        {analyzerId && renderInfo('Analyzer:', analyzerId)}
      </>
    );
  };
  return (
    <Portal>
      <TooltipWithBounds
        key={timestamp}
        top={tooltipTop}
        left={tooltipLeft}
        style={{ ...tooltipStyles, ...extraBorderStyles }}
      >
        <div ref={ref}>
          <div className={styles.tooltipRow}>
            <WhyLabsText className={chartStyles.tooltipHeadline}>{timestamp}</WhyLabsText>
          </div>
          {!!explanation?.length && (
            <>
              <div className={cx(styles.explanationRow, styles.explanationWrapper)}>
                <ErrorOutlineIcon style={explanationIconStyle} />
                <div className={styles.explanationRow}>
                  {adHocRunId && (
                    <WhyLabsText className={chartStyles[explanationTooltipStyle]}>Monitor preview:&nbsp;</WhyLabsText>
                  )}
                  {isFalseAnomaly && (
                    <WhyLabsText className={chartStyles.tooltipHeadline}>Unhelpful alert:&nbsp;</WhyLabsText>
                  )}
                  <div className={styles.flexColumn} style={{ gap: 0, margin: 0, width: 'auto' }}>
                    {explanation.map((text) => (
                      <WhyLabsText
                        key={`explanation--${text}`}
                        className={cx(chartStyles[explanationTooltipStyle], styles.breakWord)}
                      >
                        {text}
                      </WhyLabsText>
                    ))}
                  </div>
                </div>
              </div>
              {renderMonitorAndAnalyzerInformation()}
            </>
          )}
          {items.map(({ lines, color, shape }) => {
            const isDoubleItem = lines.length > 1;
            return (
              <div className={styles.tooltipRow} key={`tooltip-item--${color}--${shape}--${Math.random()}`}>
                {renderLegendItem(color, '', '', shape, isDoubleItem ? 20 : 12)}
                {renderItems(lines)}
              </div>
            );
          })}
          {renderStaleDataExplanation()}
          <hr className={chartStyles.bottomInfo} />
          <WhyLabsText lh={1} fs="italic" size={12} ta="center" p="0 4px" color={Colors.brandSecondary600}>
            {noDataAvailable ? 'No data available' : 'Click chart to show options'}
          </WhyLabsText>
        </div>
      </TooltipWithBounds>
    </Portal>
  );
};

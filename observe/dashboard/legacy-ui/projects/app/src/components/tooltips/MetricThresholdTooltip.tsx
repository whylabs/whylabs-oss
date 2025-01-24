import { AnalysisDataFragment, TimePeriod } from 'generated/graphql';
import { friendlyFormat } from 'utils/numberUtils';
import {
  getThresholdLower,
  getThresholdUpper,
  generateAnomalyExplanation,
  getAlertingThreshold,
} from 'utils/analysisUtils';
import ErrorOutlineIcon from '@material-ui/icons/ErrorOutline';
import { useAdHoc } from 'atoms/adHocAtom';
import { Colors } from '@whylabs/observatory-lib';
import { useChartStyles, selectChartStyle } from 'hooks/useChartStyles';
import { graphSnappyTooltipStyles, explainIconStyle } from 'components/visualizations/vizutils/styleUtils';
import { TooltipWithBounds, defaultStyles } from '@visx/tooltip';
import { LegendShape, renderLegendItem } from 'components/visualizations/vizutils/shapeUtils';
import { useCommonStyles } from 'hooks/useCommonStyles';
import { timeLong } from 'utils/dateUtils';
import { isExactlyNullOrUndefined } from 'utils';
import { WhyLabsText } from 'components/design-system';
import { upperCaseFirstLetterOnly } from 'utils/stringUtils';
import { StaleDataTooltipSection } from 'components/visualizations/components/StaleDataTooltipSection';
import { useResizeObserver } from '@mantine/hooks';
import useMonitorSchema from 'components/panels/monitoring/monitor-manager/hooks/useMonitorSchema';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';

const tooltipStyles = {
  ...defaultStyles,
  ...graphSnappyTooltipStyles,
};

interface MetricType {
  value: number | null | undefined;
  color: string;
  shape: LegendShape | string;
  label: string;
}

interface TooltipProps {
  analysisResult: AnalysisDataFragment | undefined;
  batchFrequency?: TimePeriod;
  metrics: MetricType[];
  decimals?: number;
  open?: boolean;
  primaryMetricLabel?: string;
  timestamp?: number | undefined;
  lastUploadTimestamp?: number | undefined;
  tooltipTop?: number | undefined;
  tooltipLeft?: number | undefined;
  mouseY?: number;
}
const MetricThresholdTooltip: React.FC<TooltipProps> = ({
  analysisResult,
  decimals = 3,
  open,
  metrics,
  timestamp,
  lastUploadTimestamp,
  batchFrequency,
  tooltipTop,
  tooltipLeft,
  primaryMetricLabel,
  mouseY,
}) => {
  const { classes: styles } = useCommonStyles();
  const { classes: chartStyles } = useChartStyles();
  const { modelId } = usePageTypeWithParams();
  const { monitorSchema } = useMonitorSchema({ modelId });

  const [adHocRunId] = useAdHoc();
  const [ref, rect] = useResizeObserver();
  if (open !== true) {
    return null;
  }
  const explanation = analysisResult
    ? generateAnomalyExplanation(analysisResult, {
        decimals,
        schema: monitorSchema,
        batchFrequency,
      })
    : undefined;
  const extraStyling = analysisResult?.isAnomaly
    ? { border: `1px solid ${adHocRunId ? Colors.chartOrange : Colors.red}` }
    : {};

  const explanationIconStyle = explainIconStyle(analysisResult, adHocRunId);
  const explanationTooltipStyle = selectChartStyle(analysisResult, adHocRunId);

  const upperThreshold = analysisResult ? getThresholdUpper(analysisResult) : undefined;
  const lowerThreshold = analysisResult ? getThresholdLower(analysisResult) : undefined;
  const alertingThreshold = analysisResult ? getAlertingThreshold(analysisResult) : undefined;

  const renderStaleWarning = () => {
    if (!analysisResult || !analysisResult.creationTimestamp) {
      return null;
    }
    return (
      <StaleDataTooltipSection
        lastUploadTimestamp={lastUploadTimestamp}
        analysisTimestamp={analysisResult.creationTimestamp}
        batchFrequency={batchFrequency}
      />
    );
  };

  const renderAnalysisThreshold = () => {
    if (!analysisResult || (isExactlyNullOrUndefined(upperThreshold) && isExactlyNullOrUndefined(lowerThreshold))) {
      return null;
    }
    const hasInvalidOrder =
      !isExactlyNullOrUndefined(upperThreshold) &&
      !isExactlyNullOrUndefined(lowerThreshold) &&
      upperThreshold < lowerThreshold;

    const isUpperValid =
      isExactlyNullOrUndefined(lowerThreshold) ||
      (!isExactlyNullOrUndefined(upperThreshold) && (!hasInvalidOrder || upperThreshold !== 0));
    const isLowerValid =
      isExactlyNullOrUndefined(upperThreshold) ||
      (!isExactlyNullOrUndefined(lowerThreshold) && (!hasInvalidOrder || lowerThreshold !== 0));

    return (
      <div className={styles.tooltipRow}>
        {renderLegendItem(Colors.quantileLight, '', 'box')}
        <div className={chartStyles.tooltipFlexField}>
          <WhyLabsText inherit className={chartStyles.tooltipBody}>
            {`Analysis threshold${isUpperValid && isLowerValid ? 's' : ''}:`}
          </WhyLabsText>
          <WhyLabsText inherit className={chartStyles.tooltipBody}>
            {isLowerValid && (
              <span className={alertingThreshold === 'lower' ? chartStyles[explanationTooltipStyle] : ''}>
                {` ${friendlyFormat(lowerThreshold, decimals)} < `}
              </span>
            )}
            <span className={analysisResult.isAnomaly ? chartStyles[explanationTooltipStyle] : ''}>
              {primaryMetricLabel || 'x'}
            </span>
            {isUpperValid && (
              <span className={alertingThreshold === 'upper' ? chartStyles[explanationTooltipStyle] : ''}>
                {` < ${friendlyFormat(upperThreshold, decimals)}`}
              </span>
            )}
          </WhyLabsText>
        </div>
      </div>
    );
  };
  const pageHeight = document?.body?.getBoundingClientRect()?.height;
  const verticalFlip = mouseY && rect.height ? mouseY + rect.height > pageHeight - 25 : false;

  const renderMonitorInfo = () => {
    const { monitorIds, monitorDisplayName, analyzerId } = analysisResult ?? {};
    const monitorInfo = monitorDisplayName || monitorIds?.[0];
    if (!monitorInfo && !analyzerId) return null;
    const renderRow = (key: string, value: string) => (
      <div className={styles.tooltipRow}>
        <div className={styles.square} />
        <WhyLabsText inherit className={chartStyles[explanationTooltipStyle]}>
          {key} {value}
        </WhyLabsText>
      </div>
    );
    return (
      <>
        {monitorInfo && renderRow('Monitor:', monitorInfo)}
        {analyzerId && renderRow('Analyzer:', analyzerId)}
      </>
    );
  };

  return (
    <div>
      <TooltipWithBounds
        top={verticalFlip ? (tooltipTop ?? 0) - rect.height : tooltipTop}
        left={tooltipLeft}
        style={{ ...tooltipStyles, ...extraStyling }}
      >
        <div ref={ref}>
          <div className={styles.tooltipRow}>
            <WhyLabsText inherit className={chartStyles.tooltipHeadline}>{`${
              timestamp ? timeLong(timestamp, batchFrequency) : 'No timestamp'
            }`}</WhyLabsText>
          </div>
          {explanation && (
            <div className={styles.tooltipRow}>
              {analysisResult?.isAnomaly && (
                <div className={styles.square}>
                  <ErrorOutlineIcon style={explanationIconStyle} />
                </div>
              )}
              {analysisResult && !analysisResult.isAnomaly && <div className={styles.square} />}
              {adHocRunId && (
                <WhyLabsText inherit className={chartStyles[explanationTooltipStyle]}>
                  Monitor preview:&nbsp;
                </WhyLabsText>
              )}
              {analysisResult && analysisResult.isFalseAlarm && (
                <WhyLabsText inherit className={chartStyles.tooltipHeadline}>
                  Unhelpful alert:&nbsp;
                </WhyLabsText>
              )}
              <WhyLabsText inherit className={chartStyles[explanationTooltipStyle]}>
                {explanation}
              </WhyLabsText>
            </div>
          )}
          {renderMonitorInfo()}
          {renderAnalysisThreshold()}
          {analysisResult?.analyzerType === 'diff' && (
            <div className={styles.tooltipRow}>
              {renderLegendItem(Colors.quantileLight, '', 'box')}
              <div className={chartStyles.tooltipFlexField}>
                <WhyLabsText inherit className={chartStyles[explanationTooltipStyle]}>
                  Analysis threshold:
                </WhyLabsText>
                <WhyLabsText className={chartStyles.tooltipBody}>
                  <span className={analysisResult?.isAnomaly ? chartStyles[explanationTooltipStyle] : ''}>
                    {`${primaryMetricLabel || 'x'} ${analysisResult.diff_mode === 'pct' ? '%' : ''} change > `}
                  </span>
                  <span className={alertingThreshold === 'diff' ? chartStyles[explanationTooltipStyle] : ''}>
                    {`${friendlyFormat(analysisResult.diff_threshold, decimals)}${
                      analysisResult.diff_mode === 'pct' ? '%' : ''
                    }`}
                  </span>
                </WhyLabsText>
              </div>
            </div>
          )}
          {analysisResult?.analyzerType === 'comparison' && (
            <div className={styles.tooltipRow}>
              <div className={styles.square} />
              <div className={chartStyles.tooltipFlexField}>
                <WhyLabsText inherit className={chartStyles.tooltipBody}>
                  Analyzer expected type:&nbsp;
                </WhyLabsText>
                <WhyLabsText inherit className={chartStyles.tooltipBody}>
                  <span className={analysisResult.isAnomaly ? chartStyles[explanationTooltipStyle] : ''}>
                    {analysisResult.comparison_expected?.toLowerCase()}
                  </span>
                </WhyLabsText>
              </div>
            </div>
          )}
          {metrics.length !== 0 &&
            metrics.map(({ color, label, shape, value }) => (
              <div className={styles.tooltipRow} key={label}>
                {renderLegendItem(color, label, shape)}
                <div className={chartStyles.tooltipFlexField}>
                  <WhyLabsText inherit className={chartStyles.tooltipBody}>
                    {upperCaseFirstLetterOnly(label)}:
                  </WhyLabsText>
                  <WhyLabsText inherit className={chartStyles.tooltipBody}>
                    {friendlyFormat(value, 2) || 'data not available'}
                  </WhyLabsText>
                </div>
              </div>
            ))}
          {renderStaleWarning()}
          <hr className={chartStyles.bottomInfo} />
          <WhyLabsText fs="italic" size={12} lh={1} ta="center" p="0 4px" color={Colors.brandSecondary600}>
            {metrics.length === 0 && !analysisResult ? 'No data available' : 'Click chart to show options'}
          </WhyLabsText>
        </div>
      </TooltipWithBounds>
    </div>
  );
};
export default MetricThresholdTooltip;

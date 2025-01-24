import { AnalysisDataFragment, AnalysisMetric } from 'generated/graphql';
import { CardType } from 'components/cards/why-card/types';
import { WhyCardDecorationType } from 'components/cards/why-card/WhyCardTexts';
import { WhyLabsContextMenuItem } from 'components/design-system';
import { useLocation } from 'react-router-dom';
import { useMarkAlertUnhelpful } from 'hooks/useMarkAlertUnhelpful';
import { findCardTypeCorrelatedCompatible } from 'components/cards/why-card/correlated-anomalies/correlatedAnomaliesUtils';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { getAlertTime } from 'utils/createAlerts';
import { useCorrelatedAnomaliesHandler } from 'hooks/useCorrelatedAnomaliesHandler';
import {
  decorationTypeToITSDMetricsMapper,
  getCardTypeTypeByDecoration,
  getDecorationTypeByMetric,
} from 'utils/analysisUtils';
import { EncodedAnalysisInfo, useStateUrlEncoder } from 'hooks/useStateUrlEncoder';
import {
  ACTION_STATE_TAG,
  NEW_GLOBAL_END_RANGE,
  NEW_GLOBAL_RANGE_PRESET,
  NEW_GLOBAL_START_RANGE,
  NEW_STACK_BACK_TO_KEY,
  SELECTED_TIMESTAMP,
} from 'types/navTags';
import {
  getNewStackURL,
  mountIndividualProfileTimeseriesDashboardUrl,
  NewStackPath,
} from 'hooks/useNewStackLinkHandler';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';
import { useGetBatchesRangeTimestamps } from 'hooks/useGetBatchesRangeTimestamps';
import { useUserContext } from 'hooks/useUserContext';
import {
  CUSTOM_RANGE,
  dateConstructorToReadableISOString,
  generateReadableDateRange,
} from 'components/super-date-picker/utils';
import { ParsedSegment } from 'pages/page-types/pageUrlQuery';
import { useWhyLabsSnackbar } from 'hooks/useWhyLabsSnackbar';
import { SimpleDateRange } from 'utils/dateRangeUtils';
import { useResourceText } from 'pages/model-page/hooks/useResourceText';
import { NavHandlerSearchParams, UniversalNavigationParams, useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { isNumber } from 'utils/typeGuards';

const FILE_TEXTS = {
  MODEL: {
    profileShortcutLabel: 'Open in profile view',
  },
  DATA: {
    profileShortcutLabel: 'Open in profile view',
  },
  LLM: {
    profileShortcutLabel: 'Open in Insights Explorer',
  },
};

export type MonitoringChartMenuItemHandlerProps = {
  profilePageHandler: () => void;
  baselineComparisonHandler?: () => void;
  dataPointAnomalies: AnalysisDataFragment[];
  profileBatchTimestamp: number;
  cardType?: CardType;
  decorationCardType?: WhyCardDecorationType;
  allowVisualizeCorrelatedAnomalies?: boolean;
  navigationInformation?: {
    resourceId?: string;
    segment?: ParsedSegment;
    columnId?: string;
    customDateRange?: SimpleDateRange;
  };
  isMissingDataPoint: boolean;
};
type MonitoringChartMenuItemsHook = {
  baselineComparison: WhyLabsContextMenuItem;
  openInProfileView: WhyLabsContextMenuItem;
  unhelpfulAnomalyToggle: WhyLabsContextMenuItem;
  correlatedAnomalies: WhyLabsContextMenuItem;
  shareAnomaly: WhyLabsContextMenuItem;
  individualProfiles: WhyLabsContextMenuItem;
  viewLLMTraces: WhyLabsContextMenuItem;
  viewInsightsForBatch: WhyLabsContextMenuItem;
};
export const useMonitoringChartMenuItems = ({
  baselineComparisonHandler,
  isMissingDataPoint,
  profilePageHandler,
  dataPointAnomalies,
  cardType,
  allowVisualizeCorrelatedAnomalies,
  navigationInformation,
  decorationCardType,
  profileBatchTimestamp,
}: MonitoringChartMenuItemHandlerProps): MonitoringChartMenuItemsHook => {
  const falseAnomaly = dataPointAnomalies.find(({ isFalseAlarm }) => isFalseAlarm);
  const { resourceTexts } = useResourceText(FILE_TEXTS);
  const [markAlertUnhelpful] = useMarkAlertUnhelpful();
  const anomalousAnalysis = dataPointAnomalies.find((a) => a.isAnomaly);
  const { featureId, outputName, pageType, modelId } = usePageTypeWithParams();
  const usedColumnName = navigationInformation?.columnId || featureId || outputName;
  const usedResourceId = navigationInformation?.resourceId || modelId;
  const { userState } = useUserContext();
  const isColumnPage = ['feature', 'segmentFeature', 'outputFeature', 'segmentOutputFeature'].includes(pageType);
  const { handleShowCorrelated } = useCorrelatedAnomaliesHandler();
  const { encodeState } = useStateUrlEncoder();
  const { enqueueSnackbar } = useWhyLabsSnackbar();
  const { pathname, search } = useLocation();
  const { datePickerSearchString } = useSuperGlobalDateRange();
  const { handleNavigation } = useNavLinkHandler();

  const { batches, loading: profileTimestampsLoading } = useGetBatchesRangeTimestamps({
    modelId: usedResourceId,
    timestamps: [profileBatchTimestamp],
  });

  const internalNavigation = (props: UniversalNavigationParams) => () => {
    handleNavigation(props);
  };

  const viewInsightsForBatch = (() => {
    const { from: batchFrom, to: batchTo } = batches?.[0] ?? {};
    const usedEndTimestamp = isNumber(batchTo) ? batchTo - 1 : null;
    const readableRange = generateReadableDateRange(batchFrom ?? null, usedEndTimestamp);
    const batchDateRange: NavHandlerSearchParams =
      readableRange && isNumber(batchFrom)
        ? [
            { name: 'startDate', value: readableRange[0] },
            { name: 'endDate', value: readableRange[1] },
            { name: 'profile', value: batchFrom.toString() },
            { name: 'profileReport', value: 'true' },
          ]
        : [];
    return {
      label: 'View batch insights',
      onClick: internalNavigation({ modelId: usedResourceId, page: 'profiles', setParams: [...batchDateRange] }),
      loading: profileTimestampsLoading,
      disabled: isMissingDataPoint || !batches?.[0],
      disabledTooltip: 'No data available',
    };
  })();

  const baselineComparison = {
    label: 'Show baseline comparison',
    onClick: baselineComparisonHandler,
    disabled: isMissingDataPoint || !baselineComparisonHandler,
    disabledTooltip: isMissingDataPoint ? 'No data available' : 'Not available for this analysis',
  };

  const openInProfileView = {
    label: resourceTexts.profileShortcutLabel,
    onClick: profilePageHandler,
    disabled: isMissingDataPoint,
    disabledTooltip: 'No data available',
  };

  const unhelpfulAnomalyToggle = (() => {
    const disabledMarkUnhelpfulAnomalyTooltip = () => {
      if (cardType === 'output') return 'Not available for this analysis';
      if (!anomalousAnalysis) return 'No anomaly in this batch';
      return '';
    };
    return {
      label: falseAnomaly ? 'Mark anomaly as helpful' : 'Mark anomaly as unhelpful',
      onClick: () => markAlertUnhelpful(dataPointAnomalies),
      disabled: !anomalousAnalysis,
      disabledTooltip: disabledMarkUnhelpfulAnomalyTooltip(),
    };
  })();

  const correlatedAnomalies = (() => {
    const showCorrelatedAnomalies = () => {
      if (!correlatedCompatibleCard) return;
      const defaultTimestamp = getAlertTime(dataPointAnomalies[0]);
      handleShowCorrelated({
        activeCorrelatedAnomalies: {
          referenceFeature: usedColumnName,
          interactionCardType: correlatedCompatibleCard,
        },
        selectedCorrelatedTimestamp: defaultTimestamp,
      });
    };
    const correlatedCompatibleCard = findCardTypeCorrelatedCompatible(cardType);
    const disabled = !(
      anomalousAnalysis &&
      correlatedCompatibleCard &&
      usedColumnName &&
      isColumnPage &&
      allowVisualizeCorrelatedAnomalies
    );
    const disabledCorrelatedAnomaliesTooltip = () => {
      if (disabled) return 'Not available for this analysis';
      if (!anomalousAnalysis) return 'No anomaly in this batch';
      return '';
    };
    return {
      label: 'Show correlated anomalies',
      onClick: showCorrelatedAnomalies,
      disabledTooltip: disabledCorrelatedAnomaliesTooltip(),
      disabled,
    };
  })();

  const shareAnomaly = (() => {
    const shareAnalysisAction = () => {
      const decoration = getDecorationTypeByMetric(anomalousAnalysis?.metric ?? AnalysisMetric.Unknown);
      const selectedProfile = anomalousAnalysis?.datasetTimestamp ?? 0;
      const actionState: EncodedAnalysisInfo = {
        analyzerId: anomalousAnalysis?.analyzerId ?? '',
        graphDecorationType: decoration,
        scrollToCard: getCardTypeTypeByDecoration(decoration),
      };
      const encodedActionState = encodeState(actionState);
      const url = `${pathname
        .concat(search)
        .concat(search ? '&' : '?')}${ACTION_STATE_TAG}=${encodedActionState}&${SELECTED_TIMESTAMP}=${
        selectedProfile ?? ''
      }`;

      if (url) {
        navigator.clipboard.writeText(window.location.host + url).then(() =>
          enqueueSnackbar({
            title: 'Link copied!',
          }),
        );
      }
    };
    const disabledShareAnomalyTooltip = () => {
      if (!isColumnPage || cardType === 'output') return 'Not available for this analysis';
      if (!anomalousAnalysis) return 'No anomaly in this batch';
      return '';
    };
    return {
      label: 'Share anomaly', // TODO #85ztgyeby: should show to all analysis
      onClick: shareAnalysisAction,
      disabledTooltip: disabledShareAnomalyTooltip(),
      disabled: !anomalousAnalysis || !isColumnPage,
    };
  })();

  const individualProfiles = (() => {
    const cardITSDMetric = decorationCardType && decorationTypeToITSDMetricsMapper.get(decorationCardType);

    const openIndividualProfilesDashboard = () => {
      const orgId = userState.user?.organization?.id ?? '';
      const url = mountIndividualProfileTimeseriesDashboardUrl({
        resourceId: usedResourceId,
        column: usedColumnName,
        metric: cardITSDMetric?.[0],
        backToUrl: window.location.href,
        datePickerSearchString,
        orgId,
      });
      if (url) {
        window.location.href = url;
      }
    };

    const disabledIndividualTimeseriesTooltip = () => {
      if (isMissingDataPoint) return 'No data available';
      return 'Not available for this analysis';
      return '';
    };
    return {
      label: 'Open in individual time series dashboard',
      onClick: openIndividualProfilesDashboard,
      loading: false,
      disabled: false,
      disabledTooltip: disabledIndividualTimeseriesTooltip(),
    };
  })();

  const viewLLMTraces = (() => {
    const openLLMTracePage = () => {
      const path: NewStackPath = `${usedResourceId}/llm-secure/traces`;
      const orgId = userState.user?.organization?.id ?? '';
      const selectedBatchStart = dateConstructorToReadableISOString(batches?.[0]?.from ?? null);
      const selectedBatchEnd = dateConstructorToReadableISOString(batches?.[0]?.to ?? null);
      const hasValidBatchRange = !!(selectedBatchStart && selectedBatchEnd);
      const batchDateParams = new URLSearchParams();
      if (hasValidBatchRange) {
        batchDateParams.set(NEW_GLOBAL_START_RANGE, selectedBatchStart!);
        batchDateParams.set(NEW_GLOBAL_END_RANGE, selectedBatchEnd!);
        batchDateParams.set(NEW_GLOBAL_RANGE_PRESET, CUSTOM_RANGE);
      }
      batchDateParams.set(NEW_STACK_BACK_TO_KEY, window.location.href);
      window.location.href = getNewStackURL({
        path,
        orgId,
        searchParams: batchDateParams,
        datePickerSearchString: hasValidBatchRange ? undefined : datePickerSearchString,
      });
    };
    return {
      label: 'View related traces',
      onClick: openLLMTracePage,
      loading: profileTimestampsLoading,
      disabled: isMissingDataPoint,
      disabledTooltip: 'No data available',
    };
  })();

  return {
    baselineComparison,
    openInProfileView,
    unhelpfulAnomalyToggle,
    correlatedAnomalies,
    shareAnomaly,
    individualProfiles,
    viewLLMTraces,
    viewInsightsForBatch,
  };
};

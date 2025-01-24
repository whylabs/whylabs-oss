import { Analyzer, Monitor } from 'generated/monitor-schema';
import { useCallback, useContext, useMemo, useState } from 'react';
import { useRecoilState } from 'recoil';
import { adHocAtom } from 'atoms/adHocAtom';
import {
  BackfillJobStatus,
  useAdHocMonitorMutation,
  useCancelRequestedBackfillJobMutation,
  useGetOrgBackfillJobsQuery,
  useRunBackfillAnalyzersMutation,
} from 'generated/graphql';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';
import isEqual from 'lodash/isEqual';
import { CardType } from 'components/cards/why-card/types';
import { getCardTypeByMetric } from 'components/cards/why-card/correlated-anomalies/correlatedAnomaliesUtils';
import { useWhyLabsSnackbar } from 'hooks/useWhyLabsSnackbar';
import { SimpleDateRange } from 'utils/dateRangeUtils';
import { ActiveBackfillState, AnalysisContext } from '../AnalysisContext';
import { backfillRangePickerParams, getAnalyzerMetric, isActiveBackfillJobStatus } from './utils';

type AnalysisPreviewDrawerViewModelReturnType = {
  closeDrawer(): void;
  setComprehensivePreview: (updatedIsEnabled: boolean) => void;
  runningAdHoc: boolean;
  setSelectedMonitor: (newSelectedMonitors?: Monitor[], newSelectedAnalyzers?: Analyzer[]) => void;
  editRangeHandler(): void;
  validationErrorMessage?: string | null;
  clearValidationMessage(): void;
  isLoading: boolean;
  handlePreviewButton(): Promise<void>;
  handleBackfillButton(): Promise<void>;
  isComprehensivePreviewWithFlag: boolean;
  hasComprehensivePreviewFlag: boolean;
  dateRange: SimpleDateRange;
  selectedMonitors?: Monitor[] | undefined;
  isDrawerOpened: boolean;
  hasAnalysisPreviewData: boolean;
  hasBackfillFlag: boolean;
  closePreview: () => void;
  activeBackfillJob?: ActiveBackfillState;
  hasBackfillRunning: boolean;
  handleStopBackfill(): Promise<void>;
  hasSuccessfullBackfill: boolean;
  clearBackfillState(): void;
  hasFailedOrCanceledBackfill: boolean;
  cancelBackfillMutationLoading: boolean;
  hasQueuedBackfill: boolean;
};
export interface AnalysisPreviewDrawerProps {
  targetColumns: string[];
  loading?: boolean;
}
export const useAnalysisPreviewDrawerViewModel = ({
  targetColumns,
  loading,
}: AnalysisPreviewDrawerProps): AnalysisPreviewDrawerViewModelReturnType => {
  const [{ analysisPreview, monitorSchema, activeBackfillJob }, analysisDispatch] = useContext(AnalysisContext);
  const { runId: currentRunId } = activeBackfillJob ?? {};

  const { modelId, segment, pageType } = usePageTypeWithParams();
  const [adHocRecoilData, setAdHocRecoilData] = useRecoilState(adHocAtom);
  const {
    dateRange,
    appliedPreset: globalPickerPreset,
    openDatePicker,
    loading: loadingDateRange,
  } = useSuperGlobalDateRange();
  const {
    dateRange: backfillRange,
    loading: loadingBackfillDateRange,
    isUsingFallbackRange: backfillIsUsingFallbackRange,
    setDatePickerRange: setBackfillDateRange,
  } = useSuperGlobalDateRange(backfillRangePickerParams);
  const { enqueueErrorSnackbar } = useWhyLabsSnackbar();
  const hasBackfillFlag = true;
  const hasComprehensivePreviewFlag = true;
  const isComprehensivePreviewWithFlag = hasComprehensivePreviewFlag && !!analysisPreview.isComprehensivePreview;
  const [adHocMonitorMutation, { loading: previewMutationLoading }] = useAdHocMonitorMutation();
  const [runBackfillAnalyzersMutation, { loading: backfillMutationLoading }] = useRunBackfillAnalyzersMutation();
  const [cancelBackfillRequestMutation, { loading: cancelBackfillMutationLoading }] =
    useCancelRequestedBackfillJobMutation();
  const [errorMessage, setErrorMessage] = useState<string | null>();
  const { refetch: listOrgActiveBackfillJobs, loading: loadingListActiveJobs } = useGetOrgBackfillJobsQuery({
    variables: { onlyActive: true },
    skip: true,
  });

  const runningAdHoc = !!adHocRecoilData.loading;
  const isLoading =
    loading || previewMutationLoading || backfillMutationLoading || runningAdHoc || loadingListActiveJobs;

  const hasAnalysisPreviewData = !!(
    !runningAdHoc &&
    !adHocRecoilData.error &&
    adHocRecoilData.runId &&
    adHocRecoilData.model === modelId &&
    adHocRecoilData.pageType === pageType &&
    isEqual(segment, adHocRecoilData.segment)
  );

  // defaults backfill date picker to preview range
  (() => {
    if (
      !loadingDateRange &&
      !loadingBackfillDateRange &&
      backfillIsUsingFallbackRange &&
      hasAnalysisPreviewData &&
      analysisPreview?.drawerOpened
    ) {
      // removing the one extra millisecond added for queries
      setBackfillDateRange({ ...dateRange, to: dateRange.to - 1 }, globalPickerPreset);
    }
  })();

  const hasBackfillRunning = (() => {
    const { status } = activeBackfillJob ?? {};
    if (!currentRunId) return false;
    return !status || isActiveBackfillJobStatus(status);
  })();

  const clearBackfillState = useCallback(() => {
    analysisDispatch({ activeBackfillJob: undefined });
  }, [analysisDispatch]);

  const clearValidationMessage = () => setErrorMessage(null);
  const setComprehensivePreview = (updatedIsEnabled: boolean) => {
    if (!hasComprehensivePreviewFlag) return;
    analysisDispatch({ analysisPreview: { ...analysisPreview, isComprehensivePreview: updatedIsEnabled } });
    if (updatedIsEnabled) {
      clearValidationMessage();
    }
  };

  const setSelectedMonitor = (newSelectedMonitors?: Monitor[], newSelectedAnalyzers?: Analyzer[]) => {
    analysisDispatch({
      analysisPreview: {
        ...analysisPreview,
        selectedMonitors: newSelectedMonitors,
        selectedAnalyzers: newSelectedAnalyzers,
      },
    });

    clearValidationMessage();
  };

  const clearAdHocRecoilData = (err = false) =>
    setAdHocRecoilData((prev) => {
      if (err) {
        return { ...prev, error: true, loading: false };
      }
      return {
        features: [],
        segment: undefined,
        model: undefined,
        runId: undefined,
        pageType: undefined,
        loading: false,
        error: err,
      };
    });

  const updateAdhocAtom = ({
    loading: adhocLoading,
    runId,
    error = false,
    cardType,
    previewedColumns,
  }: {
    loading?: boolean;
    error?: boolean;
    runId?: string;
    cardType?: CardType;
    previewedColumns?: string[] | null;
  }) =>
    setAdHocRecoilData({
      features: previewedColumns || targetColumns,
      segment,
      model: modelId,
      runId,
      pageType,
      loading: adhocLoading,
      cardType,
      error,
    });

  const parsedConfig = useMemo(() => {
    const { selectedMonitors, selectedAnalyzers } = analysisPreview;
    if (selectedMonitors && selectedAnalyzers && monitorSchema) {
      const configSchema = { ...monitorSchema };
      if (configSchema) {
        configSchema.monitors = selectedMonitors;
        configSchema.analyzers = selectedAnalyzers;
      }
      return JSON.stringify(configSchema);
    }
    return null;
  }, [analysisPreview, monitorSchema]);

  const mutationVariables = {
    model: modelId,
    features: targetColumns,
    segments: [segment.tags],
    monitorConfig: isComprehensivePreviewWithFlag ? null : parsedConfig,
    ...dateRange,
  };

  const closeDrawer = () => {
    setErrorMessage(null);
    const clearBackfill = hasSuccessfullBackfill || hasFailedOrCanceledBackfill ? { activeBackfillJob: undefined } : {};
    analysisDispatch({ analysisPreview: { ...analysisPreview, drawerOpened: false }, ...clearBackfill });
  };

  const editRangeHandler = () => {
    closeDrawer();
    openDatePicker();
  };

  const checkValidMonitorSelected = () => {
    const { selectedMonitors } = analysisPreview;
    if (isComprehensivePreviewWithFlag || selectedMonitors?.length) {
      clearValidationMessage();
      return true;
    }
    if (!isComprehensivePreviewWithFlag && selectedMonitors?.length) {
      setErrorMessage('The selected monitor has an invalid config.');
      return false;
    }
    setErrorMessage('Select a monitor to preview.');
    return false;
  };

  const getAnalyzerAnalysisMetric = () => {
    if (isComprehensivePreviewWithFlag) return null;
    const [analyzer] = analysisPreview.selectedAnalyzers ?? [];
    if (!analyzer || analyzer?.config?.type === 'disjunction' || analyzer?.config?.type === 'conjunction') return null;
    return getAnalyzerMetric(analyzer);
  };

  const handleStopBackfill = async () => {
    if (!currentRunId) {
      closeDrawer();
      return;
    }
    try {
      const { data } = await cancelBackfillRequestMutation({ variables: { runId: currentRunId } });
      if (data?.backfillAnalyzers?.cancelJob === BackfillJobStatus.Canceled) {
        analysisDispatch({
          activeBackfillJob: { ...activeBackfillJob, status: BackfillJobStatus.Canceled },
        });
      }
    } catch (err) {
      console.error(`error cenceling backfil job ${activeBackfillJob}`, JSON.stringify(err));
    }
  };

  const handleBackfillButton = async () => {
    const { selectedAnalyzers } = analysisPreview;
    const handleMutationError = (err: string) => {
      analysisDispatch({ activeBackfillJob: { error: true } });
      enqueueErrorSnackbar({
        explanation: 'Something went wrong with the backfill request, please try again',
        err: null,
      });
      console.error(`error running backfil mutation`, err);
    };

    const { data: activeJobsRequest } = await listOrgActiveBackfillJobs();
    const concurrentActiveJob = activeJobsRequest?.queryBackfillJobs?.[0];
    if (concurrentActiveJob) {
      enqueueErrorSnackbar({
        explanation: `The resource ${concurrentActiveJob.datasetId} has a backfill request in progress, either wait for the other request to complete or cancel it.`,
        err: null,
      });
      return;
    }

    if (
      previewMutationLoading ||
      backfillMutationLoading ||
      loadingBackfillDateRange ||
      !checkValidMonitorSelected() ||
      !hasBackfillFlag
    ) {
      return;
    }
    try {
      const { data: jobRequest } = await runBackfillAnalyzersMutation({
        variables: {
          datasetId: modelId,
          fromTimestamp: backfillRange.from,
          toTimestamp: backfillRange.to,
          analyzerIds: selectedAnalyzers?.flatMap(({ id }) => id || []),
        },
      });
      const runId = jobRequest?.backfillAnalyzers?.triggerBackfill?.runId;
      if (runId) {
        clearAdHocRecoilData(false);
        analysisDispatch({ activeBackfillJob: { error: false, runId } });
        return;
      }
      handleMutationError('no runId returned');
    } catch (err) {
      handleMutationError(JSON.stringify(err));
    }
  };

  /*
   * The preview endpoint is synchronous, so we have to get this handler in a component that will not be destroyed
   * when the drawer closes. The drawer container is always mounted, so we have to pass from there to the child component
   * where the run preview button lives.
   */
  const handlePreviewButton = async () => {
    if (previewMutationLoading || !checkValidMonitorSelected() || loadingDateRange) return;
    updateAdhocAtom({ loading: true });
    if (!hasBackfillFlag) {
      analysisDispatch({ analysisPreview: { ...analysisPreview, drawerOpened: false } });
    }
    try {
      const data = await adHocMonitorMutation({ variables: mutationVariables });
      // at this point the job has finished
      const { runId, columns } = data.data?.adHocMonitor?.run ?? {};
      const analysisMetric = getAnalyzerAnalysisMetric();
      const cardType = getCardTypeByMetric(analysisMetric);
      updateAdhocAtom({ runId, loading: false, error: false, cardType, previewedColumns: columns });
    } catch (err) {
      clearAdHocRecoilData(true);
      enqueueErrorSnackbar({
        explanation: 'There was an error running the analysis preview, please try again later',
        err: null,
      });
      console.error(err);
    }
  };

  const hasSuccessfullBackfill = !!(currentRunId && activeBackfillJob?.status === BackfillJobStatus.Successful);

  const hasFailedOrCanceledBackfill =
    activeBackfillJob?.error ||
    activeBackfillJob?.status === BackfillJobStatus.Failed ||
    activeBackfillJob?.status === BackfillJobStatus.Canceled;

  const hasQueuedBackfill =
    !!activeBackfillJob?.runId &&
    (!activeBackfillJob?.status ||
      activeBackfillJob?.status === BackfillJobStatus.Planning ||
      activeBackfillJob?.status === BackfillJobStatus.Pending);

  return {
    setComprehensivePreview,
    setSelectedMonitor,
    closeDrawer,
    runningAdHoc,
    isLoading,
    editRangeHandler,
    validationErrorMessage: errorMessage,
    clearValidationMessage,
    handlePreviewButton,
    isComprehensivePreviewWithFlag,
    dateRange,
    selectedMonitors: analysisPreview.selectedMonitors,
    isDrawerOpened: !!analysisPreview.drawerOpened,
    closePreview: () => clearAdHocRecoilData(false),
    handleBackfillButton,
    handleStopBackfill,
    clearBackfillState,
    cancelBackfillMutationLoading,
    hasComprehensivePreviewFlag,
    hasAnalysisPreviewData,
    hasBackfillFlag,
    hasBackfillRunning,
    activeBackfillJob,
    hasSuccessfullBackfill,
    hasFailedOrCanceledBackfill,
    hasQueuedBackfill,
  };
};

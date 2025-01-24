import { createContext, useEffect, useReducer, useRef } from 'react';
import { AnalysisDataFragment, AnalysisMetric, BackfillJobStatus, useGetOrgBackfillJobsQuery } from 'generated/graphql';
import {
  CorrelatedAnomaliesDataState,
  CorrelatedCardTypes,
  PipedCorrelatedAnomalies,
} from 'components/cards/why-card/correlated-anomalies/correlatedAnomaliesUtils';
import { CardType } from 'components/cards/why-card/types';
import { TypedEntries } from 'utils/arrayUtils';
import { getParam, usePageTypeWithParams } from 'pages/page-types/usePageType';
import { ACTIVE_CORRELATED_COLUMN, ACTIVE_CORRELATED_TYPE } from 'types/navTags';
import { MonitorSchema } from 'monitor-schema-types';
import useMonitorSchema from 'components/panels/monitoring/monitor-manager/hooks/useMonitorSchema';
import { GenericFlexColumnSelectItemData } from 'components/design-system';
import { Analyzer, Monitor } from 'generated/monitor-schema';
import isEqual from 'lodash/isEqual';
import { useUserContext } from 'hooks/useUserContext';
import { canManageMonitors } from 'utils/permissionUtils';
import { SimpleDateRange } from 'utils/dateRangeUtils';

export type MonitorInfo = {
  monitorId: string;
  displayName?: string | null;
  analyzerId: string;
  analyzerName?: string | null;
  metric: AnalysisMetric;
  monitorConfig: Monitor;
  analyzerConfig: Analyzer;
};

export type AnalysisPreviewState = {
  drawerOpened?: boolean;
  isComprehensivePreview?: boolean;
  selectedMonitors?: Monitor[];
  selectedAnalyzers?: Analyzer[];
  monitorSelectCache?: {
    key: string;
    data: {
      selectItems: GenericFlexColumnSelectItemData[];
      monitorsMap: Map<string, MonitorInfo>;
    };
  };
};
type CorrelatedFilters = {
  [key in CorrelatedCardTypes]?: { checked: boolean; showFeaturesCount: number } | undefined;
};
export type ActiveBackfillState = {
  runId?: string;
  error?: boolean;
  status?: BackfillJobStatus;
  columnsCount?: number;
  segmentsCount?: number;
  duration?: SimpleDateRange;
  progress?: number;
  monitors?: string[];
};
export type AnalysisState = {
  selectedCorrelatedTimestamp?: number;
  correlatedAnomaliesTypeFilterOption: CorrelatedFilters;
  pipedAnomaliesByMetric?: PipedCorrelatedAnomalies;
  cardsAnalysisResult: {
    [key in CardType]?: {
      data: AnalysisDataFragment[];
      hasAnomalies?: boolean;
    };
  };
  activeCorrelatedAnomalies: CorrelatedAnomaliesDataState;
  analysisPreview: AnalysisPreviewState;
  activeBackfillJob?: ActiveBackfillState;
  monitorSchema?: MonitorSchema;
};

const mapStringToCompatibleCards = new Map<string, CorrelatedCardTypes>([
  ['drift', 'drift'],
  ['uniqueValues', 'uniqueValues'],
  ['missingValues', 'missingValues'],
  ['schema', 'schema'],
  ['singleValues', 'singleValues'],
  ['totalCount', 'totalCount'],
]);

const generateEmptyState = (): AnalysisState => {
  const defaultSelection = { checked: true, showFeaturesCount: 2 };
  return analysisStateReducer(
    {
      correlatedAnomaliesTypeFilterOption: {
        singleValues: defaultSelection,
        schema: defaultSelection,
        uniqueValues: defaultSelection,
        missingValues: defaultSelection,
        totalCount: defaultSelection,
        drift: defaultSelection,
      },
      cardsAnalysisResult: {},
      activeCorrelatedAnomalies: {},
      analysisPreview: {},
    },
    {
      activeCorrelatedAnomalies: {
        referenceFeature: decodeURIComponent(getParam(ACTIVE_CORRELATED_COLUMN) ?? ''),
        interactionCardType: mapStringToCompatibleCards.get(decodeURIComponent(getParam(ACTIVE_CORRELATED_TYPE) ?? '')),
      },
    },
  );
};

export const AnalysisContext = createContext<[AnalysisState, React.Dispatch<Partial<AnalysisState>>]>([
  generateEmptyState(),
  () => {
    /**/
  },
]);

function calculateAnomalies(analysis?: AnalysisState['cardsAnalysisResult']) {
  if (!analysis) return;
  TypedEntries(analysis).forEach(([cardType, result]) => {
    const cardAnalysis = analysis[cardType];
    if (cardAnalysis) {
      cardAnalysis.hasAnomalies = result.data.some((an) => an.isAnomaly && !an.isFalseAlarm);
    }
  });
}

function handleAnomaliesFilterOptions(newState: Partial<AnalysisState>, oldState: AnalysisState) {
  if (!newState.activeCorrelatedAnomalies) return;
  const current = newState;
  const cardType = newState.activeCorrelatedAnomalies.interactionCardType;
  if (cardType) {
    current.correlatedAnomaliesTypeFilterOption = {
      ...oldState.correlatedAnomaliesTypeFilterOption,
      [cardType]: { checked: true, showFeaturesCount: 2 },
    };
  }
}

function analysisStateReducer(state: AnalysisState, action: Partial<AnalysisState>) {
  const newState = { ...action };
  calculateAnomalies(newState.cardsAnalysisResult);
  handleAnomaliesFilterOptions(newState, state);
  const finalState = {
    ...newState,
    cardsAnalysisResult: { ...state.cardsAnalysisResult, ...newState.cardsAnalysisResult },
  };
  return { ...state, ...finalState };
}

const useBackfillJobsPoller = (
  dispatch: React.Dispatch<Partial<AnalysisState>>,
  currentState?: ActiveBackfillState,
) => {
  const { modelId } = usePageTypeWithParams();
  const { getCurrentUser, loading: loadingUser } = useUserContext();
  const userCanManageMonitors = canManageMonitors(getCurrentUser());
  const firstLoad = useRef(true);
  const runningJob = currentState?.runId;
  const userNotAuthorized = loadingUser || !userCanManageMonitors;
  const isFinalStatus = !!(
    runningJob &&
    currentState?.status &&
    [BackfillJobStatus.Successful, BackfillJobStatus.Canceled, BackfillJobStatus.Failed].includes(currentState.status)
  );
  const { data: activeBackfillData } = useGetOrgBackfillJobsQuery({
    variables: { datasetId: modelId, onlyActive: !runningJob, runId: runningJob },
    skip: (!runningJob && !firstLoad.current) || isFinalStatus || userNotAuthorized,
    pollInterval: 5000,
  });

  const fetchedJob: ActiveBackfillState = (() => {
    const { queryBackfillJobs } = activeBackfillData ?? {};
    const job = runningJob ? queryBackfillJobs?.find((j) => j.runId === runningJob) : queryBackfillJobs?.[0];
    if (!job) return { runId: runningJob };
    const { runId, status, duration, progress } = job;
    return {
      runId,
      error: false,
      status,
      columnsCount: job.columns,
      segmentsCount: job.segments,
      duration: duration
        ? {
            from: duration.fromTimestamp,
            to: duration.toTimestamp,
          }
        : undefined,
      progress: Number(progress.toFixed(2)),
      monitors: job.monitorsList ?? [],
    };
  })();

  if (activeBackfillData && !isEqual(fetchedJob, currentState)) {
    firstLoad.current = false;
    dispatch({ activeBackfillJob: fetchedJob });
  }
};

export const AnalysisContextProvider = (props: { children: React.ReactNode }): JSX.Element => {
  const { modelId } = usePageTypeWithParams();
  const { monitorSchema } = useMonitorSchema({ modelId });
  const [analysisState, analysisDispatch] = useReducer(analysisStateReducer, generateEmptyState());

  useEffect(() => {
    if (!analysisState.activeCorrelatedAnomalies?.referenceFeature) {
      analysisDispatch(generateEmptyState());
    }
  }, [analysisState?.activeCorrelatedAnomalies?.referenceFeature]);

  useBackfillJobsPoller(analysisDispatch, analysisState.activeBackfillJob);

  if (!analysisState?.monitorSchema && monitorSchema) {
    analysisDispatch({ monitorSchema });
  }

  const { children } = props;

  return <AnalysisContext.Provider value={[analysisState, analysisDispatch]}>{children}</AnalysisContext.Provider>;
};

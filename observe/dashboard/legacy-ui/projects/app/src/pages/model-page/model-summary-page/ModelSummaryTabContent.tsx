import { useUserContext } from 'hooks/useUserContext';
import { useMemo, useRef } from 'react';
import { canManageMonitors } from 'utils/permissionUtils';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { useDeepMemo } from '@apollo/client/react/hooks/utils/useDeepMemo';
import { TimePeriod, useGetLlmTracesInfoQuery } from 'generated/graphql';

import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';
import { useSetHtmlTitle } from 'hooks/useSetHtmlTitle';
import { useRecoilState } from 'recoil';
import useGatherSummaryCardData from './hooks/useGatherSummaryCardData';
import AnomalySummaryCard from './model-summary-custom-cards/AnomalySummaryCard';
import DataProfilesCard from './model-summary-custom-cards/DataProfilesCard';
import GettingStartedCard from './model-summary-custom-cards/GettingStartedCard';
import InputHealthCard from './model-summary-custom-cards/InputHealthCard';
import ModelHealthCard from './model-summary-custom-cards/ModelHealthCard';
import ModelPerformanceCard from './model-summary-custom-cards/ModelPerformanceCard';
import ProjectCard from './model-summary-custom-cards/ProjectCard';
import SegmentsCard from './model-summary-custom-cards/SegmentsCard';
import ModelSummaryColumns from './ModelSummaryColumns';
import { CustomCardComponent, SUMMARY_CARD_ID, SummaryCardID } from './SummaryCard';
import { useModelSummaryTabContentCSS } from './useModelSummaryCSS';
import ExplainabilityCard from './model-summary-custom-cards/ExplainabilityCard';
import { getPrevBatchTimestamps, getSummaryTimeRanges } from './summaryCardUtils';
import IntegrationHealthCard from './model-summary-custom-cards/IntegrationHealthCard';
import { useResourceText } from '../hooks/useResourceText';
import { useResourceContext } from '../hooks/useResourceContext';
import { MonitorCoverageCard } from './model-summary-custom-cards/MonitorCoverageCard';
import LLMSecurityCard from './model-summary-custom-cards/LLMSecurityCard';
import LLMPerformanceCard from './model-summary-custom-cards/LLMPerformanceCard';
import LLMSecureCard, { llmSecureCardAtom } from './model-summary-custom-cards/LLMSecureCard';

const FILE_TEXTS = {
  DATA: {},
  MODEL: {},
  LLM: {},
};

export function ModelSummaryTabContent(): JSX.Element {
  useSetHtmlTitle('Summary');

  const { classes: styles } = useModelSummaryTabContentCSS();
  const { isDataTransform, isModelCategory, isLLMCategory } = useResourceText(FILE_TEXTS);
  const { resourceState, loading: loadingBasicInfo } = useResourceContext();
  const columnsWrapRef = useRef<HTMLDivElement>(null);
  const { dateRange, loading: dateRangeLoading } = useSuperGlobalDateRange();
  const { getCurrentUser } = useUserContext();
  const user = getCurrentUser();
  const { modelId } = usePageTypeWithParams();

  const [secureCard, setSecureCard] = useRecoilState(llmSecureCardAtom);
  const { data: tracesData } = useGetLlmTracesInfoQuery({
    variables: { modelId, ...dateRange },
    skip: dateRangeLoading,
  });
  const isSecuredLlm = !!tracesData?.model?.tracesSummary?.hasTraces;
  if (secureCard.isSecuredLlm !== isSecuredLlm) {
    // This state will avoid summary queries for non-secured LLMs
    setSecureCard((prevState) => ({ ...prevState, isSecuredLlm }));
  }

  const userCanManageMonitors = canManageMonitors(user);

  const usedBatchFrequency: TimePeriod = useMemo(() => {
    return resourceState.resource?.batchFrequency ?? TimePeriod.P1D;
  }, [resourceState]);

  const prevBatchTimestamps =
    dateRangeLoading || loadingBasicInfo ? null : getPrevBatchTimestamps(dateRange, usedBatchFrequency);

  // memoize the time ranges, so that we don't re-fetch the data unless the timestamps change
  const summaryTimeRanges = useDeepMemo(
    () => prevBatchTimestamps && getSummaryTimeRanges(prevBatchTimestamps, usedBatchFrequency),
    [prevBatchTimestamps, usedBatchFrequency],
  );

  useGatherSummaryCardData(summaryTimeRanges, modelId);

  const allCustomCards = useMemo(() => {
    const cards: CustomCardComponent[] = [
      { id: SUMMARY_CARD_ID.GETTING_STARTED, Component: GettingStartedCard },
      { id: SUMMARY_CARD_ID.DATA_PROFILES, Component: DataProfilesCard },
      { id: SUMMARY_CARD_ID.INPUT_HEALTH, Component: InputHealthCard },
      { id: SUMMARY_CARD_ID.SEGMENTS, Component: SegmentsCard },
      { id: SUMMARY_CARD_ID.PROJECT, Component: ProjectCard },
      { id: SUMMARY_CARD_ID.EXPLAINABILITY, Component: ExplainabilityCard },
      { id: SUMMARY_CARD_ID.ANOMALY_SUMMARY, Component: AnomalySummaryCard },
    ];

    if (isModelCategory) {
      cards.push({ id: SUMMARY_CARD_ID.OUTPUT_HEALTH, Component: ModelHealthCard });
      cards.push({ id: SUMMARY_CARD_ID.MODEL_PERFORMANCE, Component: ModelPerformanceCard });
    }
    if (isDataTransform) {
      cards.push({ id: SUMMARY_CARD_ID.OUTPUT_HEALTH, Component: ModelHealthCard });
    }

    cards.push({ id: SUMMARY_CARD_ID.INTEGRATION_HEALTH, Component: IntegrationHealthCard });

    if (!isLLMCategory) {
      cards.push({ id: SUMMARY_CARD_ID.MONITOR_COVERAGE, Component: MonitorCoverageCard });
    }

    if (isLLMCategory) {
      cards.push(
        { id: SUMMARY_CARD_ID.LLM_SECURITY, Component: LLMSecurityCard },
        { id: SUMMARY_CARD_ID.LLM_PERFORMANCE, Component: LLMPerformanceCard },
        // { id: SUMMARY_CARD_ID.LLM_SENTIMENT, Component: InputHealthCard }, TODO: will be added later (#86ay8fay5)
      );
      if (isSecuredLlm) {
        cards.push({ id: SUMMARY_CARD_ID.LLM_SECURE, Component: LLMSecureCard });
      }
    }
    return cards;
  }, [isDataTransform, isLLMCategory, isModelCategory, isSecuredLlm]);

  const omitCards: SummaryCardID[] = ['monitor-status-summary-card'];

  if (!userCanManageMonitors) omitCards.push(SUMMARY_CARD_ID.GETTING_STARTED);

  if (isLLMCategory) {
    omitCards.push(SUMMARY_CARD_ID.MONITOR_COVERAGE);
  }

  const renderContent = () => {
    return (
      <ModelSummaryColumns
        allCustomCards={allCustomCards}
        omitCards={omitCards}
        columnsWrapCurrent={columnsWrapRef.current}
      />
    );
  };
  return (
    <div className={styles.root}>
      <div className={styles.columnsWrap} ref={columnsWrapRef}>
        <div className={styles.columnsSidePadding} />
        {!loadingBasicInfo && renderContent()}
        <div className={styles.columnsSidePadding} />
      </div>
    </div>
  );
}

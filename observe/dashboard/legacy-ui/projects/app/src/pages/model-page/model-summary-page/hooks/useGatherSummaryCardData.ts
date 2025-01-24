import {
  AlertCategoryCounts,
  GetModelProfilesQuery,
  GetSegmentsDiscreteFeaturesAlertsQuery,
  InputOutputHealthDataDailyFragment,
  InputOutputHealthDataWeeklyFragment,
  Maybe,
  ModelType,
  useGetAnomaliesByColumnsQuery,
  useGetAnomalyDataQuery,
  useGetFeatureWeightsCardInfoQuery,
  useGetInputOutputHealthDataQuery,
  useGetIntegrationHealthInfoQuery,
  useGetLlmMetricsListQuery,
  useGetLlmSecureSummaryCardQuery,
  useGetModelPerformanceCardDataAvailabilityQuery,
  useGetModelPerformanceRollupQuery,
  useGetModelProfilesQuery,
  useGetMonitorCoverageQuery,
  useGetSegmentsDiscreteFeaturesAlertsQuery,
} from 'generated/graphql';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRecoilState, useResetRecoilState } from 'recoil';
import { getSummaryCardsAtom } from 'atoms/summaryCardsAtom';
import deepCopy from 'lodash/cloneDeep';
import { equals } from 'ramda';
import { useResourceText } from 'pages/model-page/hooks/useResourceText';

import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';
import { getFunctionsForTimePeriod } from 'utils/batchProfileUtils';
import { stringToSchema } from 'utils/schemaUtils';
import { anomalySummaryCardAtom } from '../model-summary-custom-cards/AnomalySummaryCard';
import { dataProfilesCardAtom } from '../model-summary-custom-cards/DataProfilesCard';
import { inputHealthCardAtom } from '../model-summary-custom-cards/InputHealthCard';
import { modelHealthCardAtom } from '../model-summary-custom-cards/ModelHealthCard';
import { KnownPerformanceMetric, modelPerformanceCardAtom } from '../model-summary-custom-cards/ModelPerformanceCard';
import { projectCardAtom } from '../model-summary-custom-cards/ProjectCard';
import { FormattedSegment, segmentsCardAtom } from '../model-summary-custom-cards/SegmentsCard';
import { explainabilityCardAtom } from '../model-summary-custom-cards/ExplainabilityCard';
import { CustomCard } from '../SummaryCard';
import { integrationHealthCardAtom } from '../model-summary-custom-cards/IntegrationHealthCard';
import {
  filterMostAnomalousColumnList,
  getMidRangeFromBatchFrequencyAndShortRange,
  SummaryTimeRanges,
} from '../summaryCardUtils';
import { monitorCoverageCardAtom } from '../model-summary-custom-cards/MonitorCoverageCard';
import { llmSecurityCardAtom } from '../model-summary-custom-cards/LLMSecurityCard';
import { llmPerformanceCardAtom } from '../model-summary-custom-cards/LLMPerformanceCard';
import { llmSecureCardAtom } from '../model-summary-custom-cards/LLMSecureCard';

export default function useGatherSummaryCardData(timeRanges: SummaryTimeRanges | null, modelId: string): void {
  const { category, isDataCategory, isDataTransform, isLLMCategory } = useResourceText({
    DATA: {},
    MODEL: {},
    LLM: {},
  });
  const [, setAnomalyCard] = useRecoilState(anomalySummaryCardAtom);
  const [, setDataProfilesCard] = useRecoilState(dataProfilesCardAtom);
  const [, setProjectCard] = useRecoilState(projectCardAtom);
  const [, setInputHealthCard] = useRecoilState(inputHealthCardAtom);
  const [llmSecurityCard, setLLMSecurityCard] = useRecoilState(llmSecurityCardAtom);
  const [llmPerformanceCard, setLLMPerformanceCard] = useRecoilState(llmPerformanceCardAtom);
  const [, setSegmentsCard] = useRecoilState(segmentsCardAtom);
  const [, setModelHealthCard] = useRecoilState(modelHealthCardAtom);
  const [, setModelPerformanceCard] = useRecoilState(modelPerformanceCardAtom);
  const [, setExplainabilityCard] = useRecoilState(explainabilityCardAtom);
  const [, setIntegrationHealthCard] = useRecoilState(integrationHealthCardAtom);
  const [, setMonitorCoverageState] = useRecoilState(monitorCoverageCardAtom);
  const [{ isSecuredLlm }, setLlmSecureCard] = useRecoilState(llmSecureCardAtom);
  const resetExplainabilityCard = useResetRecoilState(explainabilityCardAtom);
  const [, setSummaryCards] = useRecoilState<CustomCard[]>(getSummaryCardsAtom(category, isDataTransform));
  const { loading: loadingDateRange } = useSuperGlobalDateRange();
  const firstLoad = useRef(true);
  const checkFlags = useRef(true);

  if (checkFlags.current) {
    checkFlags.current = false;
  }

  /**
   * EXTRACTING REFETCHING FUNCTIONS FROM QUERIES
   */
  /**
   * Input and Model Health cards
   */
  const { refetch: refetchInputOutputData } = useGetInputOutputHealthDataQuery({ skip: true });

  /**
   * LLMSecurityCard and LLMPerformanceCard
   */
  const { data: llmMetricsData, loading: llmMetricsLoading } = useGetLlmMetricsListQuery({
    variables: { modelId, tags: [], granularity: timeRanges?.batchFrequency },
    skip: !isLLMCategory || !timeRanges,
  });

  const [llmSecurityList, llmPerformanceList] = useMemo(() => {
    const [securityList, performanceList]: string[][] = [[], []];
    if (llmMetricsLoading) return [securityList, performanceList];
    llmMetricsData?.model?.customMetrics?.forEach((metric) => {
      const metricName = metric.metadata?.queryDefinition?.column;
      if (!metricName) return;
      if (metric.metadata?.tags?.includes('security')) {
        securityList.push(metricName);
      }
      if (metric.metadata?.tags?.includes('performance')) {
        performanceList.push(metricName);
      }
    });
    return [securityList, performanceList];
  }, [llmMetricsData?.model?.customMetrics, llmMetricsLoading]);

  if (llmMetricsData && llmSecurityCard.securityMetricsList.metrics !== llmSecurityList) {
    setLLMSecurityCard((state) => ({
      ...state,
      securityMetricsList: { loading: llmMetricsLoading, metrics: llmSecurityList },
    }));
  }

  if (llmMetricsData && llmPerformanceCard.performanceMetricsList.metrics !== llmPerformanceList) {
    setLLMPerformanceCard((state) => ({
      ...state,
      performanceMetricsList: { loading: llmMetricsLoading, metrics: llmPerformanceList },
    }));
  }

  const { refetch: refetchLlmSecurityAnomalies } = useGetAnomaliesByColumnsQuery({ skip: true });
  const { refetch: refetchLlmPerformanceAnomalies } = useGetAnomaliesByColumnsQuery({ skip: true });

  /**
   * DataProfilesCard
   */
  const { refetch: refetchDataProfiles } = useGetModelProfilesQuery({ skip: true });

  /**
   * AnomalyCard
   */
  const { refetch: fetchAnomalyData } = useGetAnomalyDataQuery({ skip: true });

  /**
   * SegmentsCard
   */
  const { refetch: refetchDataSegments } = useGetSegmentsDiscreteFeaturesAlertsQuery({ skip: true });
  /**
   * ModelPerformanceCard
   */
  const { refetch: refetchModelPerformanceAvailability } = useGetModelPerformanceCardDataAvailabilityQuery({
    skip: true,
  });
  const { refetch: refetchModelPerformance } = useGetModelPerformanceRollupQuery({ skip: true });

  /**
   * ExplainabilityCard
   */
  const { refetch: refetchExplainability } = useGetFeatureWeightsCardInfoQuery({ skip: true });

  /**
   * IntegrationHealthCard
   */
  const { refetch: refetchIntegrationHealth } = useGetIntegrationHealthInfoQuery({ skip: true });

  const { refetch: refetchMonitorCoverage } = useGetMonitorCoverageQuery({ skip: true });

  /**
   * LLM Secure Card
   */
  const { refetch: refetchLlmSecure } = useGetLlmSecureSummaryCardQuery({ skip: true });

  const getTotalAlertsCount = (categoryCounts?: Maybe<Pick<AlertCategoryCounts, 'totals'>>): number =>
    categoryCounts?.totals?.reduce((sum, total) => sum + total.count, 0) ?? 0;

  const parseInputOutputHealthCardData = useCallback(
    (data?: Maybe<InputOutputHealthDataDailyFragment | InputOutputHealthDataWeeklyFragment>) => {
      const totalInputFeatures = data?.entitySchema?.inputCounts.total ?? 0;
      const totalOutputFeatures = data?.outputs?.length ?? 0;
      const inputVolume = data?.batches?.reduce((sum, batch) => sum + batch.inputCount, 0) ?? 0;
      const outputVolume = data?.batches?.reduce((sum, batch) => sum + batch.outputCount, 0) ?? 0;

      const totalAlerts = getTotalAlertsCount(data?.anomalyCounts);
      const totalOutputAlerts =
        data?.outputs?.reduce((totalSum, output) => {
          return totalSum + getTotalAlertsCount(output.anomalyCounts);
        }, 0) ?? 0;
      const totalInputAlerts = totalAlerts - totalOutputAlerts;

      return {
        totalInputFeatures,
        totalOutputFeatures,
        totalInputAlerts,
        totalOutputAlerts,
        inputVolume,
        outputVolume,
      };
    },
    [],
  );

  const handleDailyInputHealthCardData = useCallback(
    (data?: Maybe<InputOutputHealthDataDailyFragment>) => {
      const {
        totalInputFeatures,
        totalOutputFeatures,
        totalInputAlerts,
        totalOutputAlerts,
        inputVolume,
        outputVolume,
      } = parseInputOutputHealthCardData(data);

      setInputHealthCard((prevState) => ({
        ...prevState,
        dayInputAlerts: { loading: false, features: totalInputFeatures, alerts: totalInputAlerts },
        dayInput: { loading: false, dataVolume: inputVolume },
      }));

      setModelHealthCard((prevState) => ({
        ...prevState,
        dayOutput: { loading: false, dataVolume: outputVolume },
        dayOutputAlerts: { loading: false, features: totalOutputFeatures, alerts: totalOutputAlerts },
      }));
    },
    [parseInputOutputHealthCardData, setInputHealthCard, setModelHealthCard],
  );

  const handleWeeklyInputHealthCardData = useCallback(
    (data?: Maybe<InputOutputHealthDataWeeklyFragment>) => {
      const { totalInputAlerts, totalOutputAlerts, inputVolume, outputVolume } = parseInputOutputHealthCardData(data);

      setInputHealthCard((prevState) => ({
        ...prevState,
        weekInput: { loading: false, dataVolume: inputVolume },
        latestTimeStamp: { timestamp: data?.dataAvailability?.latestTimestamp || 0, loading: false },
        weekInputAlerts: { loading: false, alerts: totalInputAlerts },
      }));

      setModelHealthCard((prevState) => ({
        ...prevState,
        weekOutputAlerts: { loading: false, alerts: totalOutputAlerts },
        weekOutput: { loading: false, dataVolume: outputVolume },
        latestTimeStamp: { timestamp: data?.dataAvailability?.latestTimestamp || 0, loading: false },
      }));
    },
    [parseInputOutputHealthCardData, setInputHealthCard, setModelHealthCard],
  );

  /**
   * Fetching data for: InputHealthCard - Features
   */
  const refetchInputHealthCardData = useCallback(() => {
    if (!timeRanges) return;
    setInputHealthCard((prevState) => ({
      weekInput: { ...prevState.weekInput, loading: true },
      dayInput: { ...prevState.dayInput, loading: true },
      weekInputAlerts: { ...prevState.weekInputAlerts, loading: true },
      dayInputAlerts: { ...prevState.dayInputAlerts, loading: true },
      latestTimeStamp: { ...prevState.latestTimeStamp, loading: true },
      batchFrequency: timeRanges.batchFrequency,
    }));

    setModelHealthCard((prevState) => ({
      weekOutput: { ...prevState.weekOutput, loading: true },
      dayOutput: { ...prevState.dayOutput, loading: true },
      weekOutputAlerts: { ...prevState.weekOutputAlerts, loading: true },
      dayOutputAlerts: { ...prevState.dayOutputAlerts, loading: true },
      latestTimeStamp: { ...prevState.latestTimeStamp, loading: true },
      batchFrequency: timeRanges.batchFrequency,
    }));

    refetchInputOutputData?.({
      dailyFrom: timeRanges.shortRange.from,
      dailyTo: timeRanges.shortRange.to,
      weeklyFrom: timeRanges.midRange.from,
      weeklyTo: timeRanges.midRange.to,
      modelId,
    })
      ?.then(({ data }) => {
        const { weekly, daily } = data;
        handleDailyInputHealthCardData(daily);
        handleWeeklyInputHealthCardData(weekly);
      })
      .catch((err) => {
        setInputHealthCard((prevState) => ({
          ...prevState,
          weekInput: { ...prevState.weekInput, loading: false },
          latestTimeStamp: { ...prevState.latestTimeStamp, loading: false },
          weekInputAlerts: { ...prevState.weekInputAlerts, loading: false },
          dayInputAlerts: { ...prevState.dayInputAlerts, loading: false },
          dayInput: { ...prevState.dayInput, loading: false },
          batchFrequency: timeRanges.batchFrequency,
        }));

        setModelHealthCard((prevState) => ({
          ...prevState,
          weekOutput: { ...prevState.weekOutput, loading: false },
          weekOutputAlerts: { ...prevState.weekOutputAlerts, loading: false },
          latestTimeStamp: { ...prevState.latestTimeStamp, loading: false },
          dayOutput: { ...prevState.dayOutput, loading: false },
          dayOutputAlerts: { ...prevState.dayOutputAlerts, loading: false },
          batchFrequency: timeRanges.batchFrequency,
        }));

        console.error(`Failed to load model health cards: ${err}`, JSON.stringify(timeRanges));
      });
  }, [
    setInputHealthCard,
    setModelHealthCard,
    refetchInputOutputData,
    timeRanges,
    modelId,
    handleDailyInputHealthCardData,
    handleWeeklyInputHealthCardData,
  ]);

  /**
   * Fetching data for: LLMSecure card
   */
  const refetchLLMSecureCardData = useCallback(() => {
    if (!timeRanges || !isLLMCategory) return;
    setLlmSecureCard((prevState) => ({
      ...prevState,
      batchFrequency: timeRanges.batchFrequency,
      loading: true,
    }));
    refetchLlmSecure({
      globalRangeFrom: timeRanges.globalDateRange.from,
      globalRangeTo: timeRanges.globalDateRange.to,
      shortRangeFrom: timeRanges.shortRange.from,
      shortRangeTo: timeRanges.shortRange.to,
      midRangeFrom: timeRanges.midRange.from,
      midRangeTo: timeRanges.midRange.to,
      modelId,
    })
      ?.then(({ data: { model } }) => {
        const { currentIssuesData, comparedIssuesData, tracesInRange } = model ?? {};
        setLlmSecureCard((prevState) => ({
          ...prevState,
          tracesInRange: tracesInRange?.totalCount ?? 0,
          shortRangeData: {
            violationsCount: currentIssuesData?.violationsCount ?? 0,
            blockedInteractionsCount: currentIssuesData?.blockedInteractionsCount ?? 0,
          },
          midRangeData: {
            violationsCount: comparedIssuesData?.violationsCount ?? 0,
            blockedInteractionsCount: comparedIssuesData?.blockedInteractionsCount ?? 0,
          },
          // this is the latest timestamp within last 10 years, not limited to selected date range
          latestTraceTimestamp: tracesInRange?.latestTraceTimestamp,
        }));
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        setLlmSecureCard((prevState) => ({
          ...prevState,
          loading: false,
        }));
      });
  }, [timeRanges, isLLMCategory, setLlmSecureCard, refetchLlmSecure, modelId]);

  /**
   * Fetching data for: LLMSecurity card
   */
  const refetchLLMSecurityCardData = useCallback(() => {
    if (!timeRanges) return;
    const emptyMetrics = !llmSecurityList?.length;
    setLLMSecurityCard((prevState) => ({
      ...prevState,
      ...(emptyMetrics ? { dayAnomaliesCount: 0, weekAnomaliesCount: 0, loading: false } : { loading: true }),
    }));
    if (emptyMetrics) return;
    refetchLlmSecurityAnomalies?.({
      dailyFrom: timeRanges.shortRange.from,
      dailyTo: timeRanges.shortRange.to,
      weeklyFrom: timeRanges.midRange.from,
      weeklyTo: timeRanges.midRange.to,
      model: modelId,
      metrics: llmSecurityList,
    })
      ?.then(({ data: { daily, weekly } }) => {
        const dayAnomaliesCount = daily?.length ?? 0;
        const weekAnomaliesCount = weekly?.length ?? 0;
        const mostAnomalousMetrics = filterMostAnomalousColumnList(daily ?? []);
        setLLMSecurityCard((prevState) => ({
          ...prevState,
          loading: false,
          batchFrequency: timeRanges.batchFrequency,
          dayAnomaliesCount,
          weekAnomaliesCount,
          mostAnomalousMetrics,
        }));
      })
      .catch((err) => {
        setLLMSecurityCard((prevState) => ({
          ...prevState,
          loading: false,
        }));
        console.error(err);
      });
  }, [setLLMSecurityCard, refetchLlmSecurityAnomalies, timeRanges, modelId, llmSecurityList]);

  /**
   * Fetching data for: LLMPerformance card
   */
  const refetchLLMPerformanceCardData = useCallback(() => {
    if (!timeRanges) return;
    const emptyMetrics = !llmPerformanceList?.length;
    setLLMPerformanceCard((prevState) => ({
      ...prevState,
      ...(emptyMetrics ? { dayAnomaliesCount: 0, weekAnomaliesCount: 0, loading: false } : { loading: true }),
    }));
    if (emptyMetrics) return;
    refetchLlmPerformanceAnomalies?.({
      dailyFrom: timeRanges.shortRange.from,
      dailyTo: timeRanges.shortRange.to,
      weeklyFrom: timeRanges.midRange.from,
      weeklyTo: timeRanges.midRange.to,
      model: modelId,
      metrics: llmPerformanceList,
    })
      ?.then(({ data: { daily, weekly } }) => {
        const dayAnomaliesCount = daily?.length ?? 0;
        const weekAnomaliesCount = weekly?.length ?? 0;
        const mostAnomalousMetrics = filterMostAnomalousColumnList(daily ?? []);
        setLLMPerformanceCard((prevState) => ({
          ...prevState,
          loading: false,
          batchFrequency: timeRanges.batchFrequency,
          dayAnomaliesCount,
          weekAnomaliesCount,
          mostAnomalousMetrics,
        }));
      })
      .catch((err) => {
        setLLMPerformanceCard((prevState) => ({
          ...prevState,
          loading: false,
        }));
        console.error(err);
      });
  }, [setLLMPerformanceCard, refetchLlmPerformanceAnomalies, timeRanges, modelId, llmPerformanceList]);

  /**
   * Fetching data for: AnomalySummaryCard
   */
  const refetchAnomalyCardData = useCallback(() => {
    if (!timeRanges) return;
    setAnomalyCard((prevState) => ({
      ...prevState,
      loading: true,
    }));
    fetchAnomalyData?.({
      dailyFrom: timeRanges.shortRange.from,
      dailyTo: timeRanges.shortRange.to,
      weeklyFrom: timeRanges.midRange.from,
      weeklyTo: timeRanges.midRange.to,
      modelId,
    })
      ?.then(({ data: { daily, monitorConfig, weekly } }) => {
        const monitorSchema = stringToSchema(monitorConfig);
        const activeMonitors = monitorSchema?.monitors.filter(({ disabled }) => !disabled).length ?? 0;

        setAnomalyCard({ activeMonitors, daily, loading: false, weekly, batchFrequency: timeRanges.batchFrequency });
      })
      .catch((err) => {
        setAnomalyCard((prevState) => ({
          ...prevState,
          loading: false,
        }));
        console.error(err);
      });
  }, [fetchAnomalyData, modelId, setAnomalyCard, timeRanges]);

  const handleSegmentsData = useCallback(
    (data: GetSegmentsDiscreteFeaturesAlertsQuery) => {
      if (!timeRanges) return;
      const withMostAlerts: FormattedSegment[] =
        data.model?.segments
          .map((segment) => ({
            tags: segment.tags,
            totalAlerts: segment.anomalyCounts?.totals?.reduce((sum, count) => sum + count.count, 0) ?? 0,
          }))
          ?.filter((s) => s.totalAlerts > 0) ?? [];

      setSegmentsCard((prevState) => ({
        ...prevState,
        segmentsDayAlerts: {
          loading: false,
          count: data.dailyAnomalyCount ?? 0,
        },
        segmentsWeekAlerts: {
          loading: false,
          count: data.weeklyAnomalyCount ?? 0,
        },
        segments: {
          totalCount: data.model?.totalSegments ?? 0,
          withMostAlerts,
          loading: false,
        },
        batchFrequency: timeRanges.batchFrequency,
      }));
    },
    [setSegmentsCard, timeRanges],
  );

  /**
   * Fetching data for: SegmentsCard
   */
  const refetchSegmentsCardData = useCallback(() => {
    if (!timeRanges) return;
    setSegmentsCard((prevState) => ({
      segments: {
        ...prevState.segments,
        loading: true,
      },
      segmentsWeekAlerts: { ...prevState.segmentsWeekAlerts, loading: true },
      segmentsDayAlerts: { ...prevState.segmentsDayAlerts, loading: true },
      batchFrequency: timeRanges.batchFrequency,
    }));
    refetchDataSegments?.({
      dailyFrom: timeRanges.shortRange.from,
      dailyTo: timeRanges.shortRange.to,
      weeklyFrom: timeRanges.midRange.from,
      weeklyTo: timeRanges.midRange.to,
      modelId,
    })
      ?.then(({ data }) => {
        handleSegmentsData(data);
      })
      .catch((err) => {
        setSegmentsCard((prevState) => ({
          ...prevState,
          segments: {
            ...prevState.segments,
            loading: false,
          },
          segmentsWeekAlerts: {
            ...prevState.segmentsWeekAlerts,
            loading: false,
          },
        }));
        console.error(err);
      });
  }, [timeRanges, setSegmentsCard, refetchDataSegments, modelId, handleSegmentsData]);

  /**
   * Fetching data for: MonitorStatusCard and ProjectCard
   */
  const refetchDataProfilesCardData = useCallback(async () => {
    setDataProfilesCard((prevState) => ({
      ...prevState,
      loading: true,
    }));

    let data: GetModelProfilesQuery;
    try {
      data = (
        await refetchDataProfiles({
          modelId,
        })
      ).data;
    } catch (err) {
      console.error(err);
      setDataProfilesCard((prevState) => ({
        ...prevState,
        loading: false,
      }));

      setProjectCard((prevState) => ({
        ...prevState,
        loading: false,
      }));
      return;
    }

    const batches = data?.model?.batches || [];
    const sortedBatches = batches.map((batch) => batch.timestamp).sort();

    setDataProfilesCard({
      // Sometimes the batch.timestamp is undefined, so we filter it out
      profiles: sortedBatches.filter(Boolean),
      refProfiles: data.model?.referenceProfiles?.map((it) => it.id) || [],
      loading: false,
    });

    setProjectCard({
      model: data.model,
      loading: false,
    });
  }, [modelId, refetchDataProfiles, setDataProfilesCard, setProjectCard]);

  /**
   * Fetching data for: IntegrationHealthCard
   */
  const refetchIntegrationHealthCardData = useCallback(() => {
    if (!timeRanges) return;
    setIntegrationHealthCard((prevState) => ({
      ...prevState,
      loading: true,
    }));
    if (loadingDateRange) return;
    refetchIntegrationHealth?.({
      modelId,
      from: timeRanges.globalDateRange.from,
      to: timeRanges.globalDateRange.to,
      dataHealthFrom: timeRanges.midRange.from,
      dataHealthTo: timeRanges.midRange.to,
    })
      ?.then(({ data }) => {
        const batches = data.model?.batches?.map((batch) => batch.timestamp).sort() ?? [];
        const lastIntegrationAnomalies =
          data.model?.dataHealthAnomalies?.sort((a, b) => (b?.datasetTimestamp ?? 0) - (a?.datasetTimestamp ?? 0)) ??
          [];
        setIntegrationHealthCard({
          loading: false,
          data: {
            anomaliesInRange: data.model?.anomaliesInRange?.length ?? 0,
            batchesInRange: data.model?.batches.length ?? 0,
            latestReceivedTimeStamp: data.model?.dataAvailability?.latestTimestamp ?? 0,
            firstBatchInRange: batches[0] ?? 0,
            lastBatchInRange: batches[batches.length - 1] ?? 0,
            lastIntegrationAnomalies,
            batchFrequency: timeRanges.batchFrequency,
          },
        });
      })
      .catch((err) => {
        setIntegrationHealthCard({ loading: false, data: undefined });
        console.error(err);
      });
  }, [setIntegrationHealthCard, loadingDateRange, refetchIntegrationHealth, modelId, timeRanges]);

  /**
   * Fetching data for: MonitorCoverageCard
   */
  const refetchMonitorCoverageData = useCallback(() => {
    setMonitorCoverageState((prevState) => ({ ...prevState, loading: true }));

    refetchMonitorCoverage({
      modelId,
    })
      .then(({ data }) => {
        setMonitorCoverageState((prevState) => ({
          ...prevState,
          error: false,
          loading: false,
          coveredCategories: data.model?.monitoredCategories ?? [],
        }));
      })
      .catch((err) => {
        setMonitorCoverageState((prevState) => ({ ...prevState, loading: false, error: true }));
        console.error(err);
      });
  }, [modelId, refetchMonitorCoverage, setMonitorCoverageState]);

  /**
   * Fetching data for model performance card
   */
  const refetchDataModelPerformanceCard = useCallback(async () => {
    if (!timeRanges) return;
    setModelPerformanceCard((prevState) => ({
      ...prevState,
      loading: true,
      batchFrequency: timeRanges.batchFrequency,
    }));

    try {
      // query for get last profile with performance data
      const { data: performanceAvailability } = await refetchModelPerformanceAvailability({
        datasetId: modelId,
        granularity: timeRanges.batchFrequency,
        ...timeRanges.globalDateRange,
      });

      const metric: KnownPerformanceMetric =
        performanceAvailability.model?.modelType === ModelType.Regression ? 'mean_squared_error' : 'accuracy';

      const metricTimeseries = performanceAvailability.model?.timeseries?.find((r) => r.name === metric)?.values ?? [];
      const latestPerformanceProfile = metricTimeseries ? metricTimeseries[metricTimeseries.length - 1] : null;
      const { setStartOfProfile, setEndOfProfile } = getFunctionsForTimePeriod.get(timeRanges.batchFrequency) ?? {};
      const shortRange = (() => {
        if (latestPerformanceProfile && setStartOfProfile && setEndOfProfile) {
          const { timestamp } = latestPerformanceProfile;
          return { from: setStartOfProfile(timestamp).getTime(), to: setEndOfProfile(timestamp).getTime() };
        }
        return timeRanges.shortRange;
      })();
      const midRange = getMidRangeFromBatchFrequencyAndShortRange(shortRange, timeRanges.batchFrequency);
      // querying rollUp data from the last profile with performance data within global range
      const { data: performanceRollUpData } = await refetchModelPerformance({
        datasetId: modelId,
        dailyFrom: shortRange.from,
        dailyTo: shortRange.to,
        weeklyFrom: midRange.from,
        weeklyTo: midRange.to,
      });

      const { oneDay: oneDayRollup, oneWeek: oneWeekRollup } =
        performanceRollUpData?.model?.rollup?.find((r) => r.name === metric) ?? {};

      setModelPerformanceCard((prevState) => ({
        ...prevState,
        rollup: {
          oneDay: oneDayRollup?.[0]?.value ?? null,
          oneWeek: oneWeekRollup?.[0]?.value ?? null,
        },
        lastAvailableDataPoint: latestPerformanceProfile,
        latestBatchTimeStamp: performanceAvailability?.model?.dataAvailability?.latestTimestamp ?? 0,
        loading: false,
        metric,
        batchFrequency: timeRanges.batchFrequency,
      }));
    } catch (error) {
      console.error(error);

      setModelPerformanceCard((prevState) => ({
        ...prevState,
        loading: false,
        batchFrequency: timeRanges.batchFrequency,
      }));
    }
  }, [timeRanges, setModelPerformanceCard, refetchModelPerformanceAvailability, modelId, refetchModelPerformance]);

  const refetchDataExplainabilityCard = useCallback(() => {
    // datasets don't have explainability
    if (isDataCategory || !timeRanges) return;
    resetExplainabilityCard();
    refetchExplainability?.({
      id: modelId,
      filter: {
        fromTimestamp: timeRanges.globalDateRange.from,
        toTimestamp: timeRanges.globalDateRange.to,
      },
    })
      ?.then(({ data: { model } }) => {
        const hasWeights = !!model?.weightMetadata?.hasWeights;
        if (hasWeights) {
          showExplainabilityCard();
        }
        setExplainabilityCard((prevState) => ({
          ...prevState,
          data: model?.filteredFeatures.results ?? [],
          latestTimeStamp: model?.weightMetadata?.lastUpdatedAt ?? 0,
          loading: false,
          hasWeights,
        }));
      })
      .catch((error) => {
        console.error(error);
        setExplainabilityCard((prevState) => ({
          ...prevState,
          loading: false,
          data: undefined,
          hasWeights: undefined,
        }));
      });

    function showExplainabilityCard() {
      setSummaryCards((prevState) => {
        const newState = deepCopy(prevState);
        const explainabilityCard = newState.find((card) => card.id === 'explainability-summary-card');
        if (explainabilityCard) {
          explainabilityCard.show = true;
        }
        return newState;
      });
    }
  }, [
    timeRanges,
    isDataCategory,
    modelId,
    refetchExplainability,
    resetExplainabilityCard,
    setExplainabilityCard,
    setSummaryCards,
  ]);

  /**
   * Reload when date range or model has been changed
   */
  const [prevModel, setPrevModel] = useState<string>();
  const prevTimestamps = timeRanges ? { midRange: timeRanges.midRange, shortRange: timeRanges.shortRange } : null;
  const [prevRange, setPrevRange] = useState<Pick<SummaryTimeRanges, 'midRange' | 'shortRange'> | null>(prevTimestamps);
  if (prevTimestamps && (prevModel !== modelId || !equals(prevRange, prevTimestamps))) {
    firstLoad.current = true;
    setPrevModel(modelId);
    setPrevRange(prevTimestamps);
  }

  /* Only re fetching global dates query dependents */
  useEffect(() => {
    if (!firstLoad.current && !loadingDateRange) {
      refetchIntegrationHealthCardData();
      refetchDataExplainabilityCard();
      refetchDataModelPerformanceCard();
      refetchLLMSecureCardData();
    }
  }, [
    refetchIntegrationHealthCardData,
    timeRanges?.globalDateRange,
    refetchDataExplainabilityCard,
    loadingDateRange,
    refetchDataModelPerformanceCard,
    refetchLLMSecureCardData,
  ]);

  useEffect(() => {
    if (isLLMCategory) {
      refetchLLMSecurityCardData();
      refetchLLMPerformanceCardData();
    }
  }, [isLLMCategory, refetchLLMPerformanceCardData, refetchLLMSecureCardData, refetchLLMSecurityCardData]);

  useEffect(() => {
    if (isSecuredLlm) {
      refetchLLMSecureCardData();
    }
  }, [isSecuredLlm, refetchLLMSecureCardData]);

  /**
   * USING REFETCHING FUNCTIONS
   */
  useEffect(() => {
    if (!firstLoad.current) return;
    firstLoad.current = false;

    refetchDataProfilesCardData();
    refetchInputHealthCardData();
    refetchAnomalyCardData();
    refetchSegmentsCardData();
    refetchDataModelPerformanceCard();
    refetchDataExplainabilityCard();
    refetchIntegrationHealthCardData();
    refetchMonitorCoverageData();
  }, [
    refetchDataProfilesCardData,
    refetchInputHealthCardData,
    refetchSegmentsCardData,
    refetchDataModelPerformanceCard,
    refetchDataExplainabilityCard,
    refetchAnomalyCardData,
    refetchIntegrationHealthCardData,
    refetchMonitorCoverageData,
  ]);
}

import { AnalysisMetric, BackfillJobStatus, useGetColumnActiveMonitorsQuery } from 'generated/graphql';
import { Analyzer } from 'generated/monitor-schema';
import { useContext } from 'react';
import { createStyles } from '@mantine/core';
import { Colors } from '@whylabs/observatory-lib';
import { SelectorRowText, GenericFlexColumnSelectItemData } from 'components/design-system';
import { getAnalysisMetricByAnalyzerConfigMetric } from 'utils/analysisUtils';
import { ParsedSegment } from 'pages/page-types/pageUrlQuery';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { segmentTagsToString } from 'utils/segments';
import { CustomRangeSearchParams } from 'components/super-date-picker/utils';
import { TEMP_END_DATE_RANGE, TEMP_RANGE_PRESET, TEMP_START_DATE_RANGE } from 'types/navTags';
import { AnalysisContext, MonitorInfo } from '../AnalysisContext';

export const usePreviewDrawerStyles = createStyles(() => ({
  drawerHeader: {
    padding: '20px 20px 0 20px',
  },
  checkboxLabel: {
    color: Colors.night1,
    fontSize: 14,
    fontWeight: 400,
    lineHeight: 1.55,
    marginLeft: 3,
  },
  drawerBody: {
    padding: '15px 20px 20px 20px !important',
  },
  title: {
    color: Colors.secondaryLight1000,
    fontSize: 15,
    fontWeight: 600,
    lineHeight: 0.93,
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    gap: 15,
  },
  commonButtonPadding: {
    padding: '8px 17px',
  },
  divider: {
    width: '100%',
    borderTop: `1px solid ${Colors.brandSecondary100}`,
    margin: 0,
  },
  spaceBetweenFlex: {
    display: 'flex',
    width: '100%',
    justifyContent: 'space-between',
  },
  progressText: {
    color: Colors.secondaryLight900,
    fontSize: 12,
    fontWeight: 400,
    lineHeight: 1.55,
  },
}));

const SUPPORTED_PREVIEW_METRICS = [
  AnalysisMetric.FrequentItems,
  AnalysisMetric.Histogram,
  AnalysisMetric.Count,
  AnalysisMetric.CountNull,
  AnalysisMetric.CountNullRatio,
  AnalysisMetric.UniqueEst,
  AnalysisMetric.UniqueEstRatio,
  AnalysisMetric.InferredDataType,
  AnalysisMetric.InferredDataType,
  AnalysisMetric.Median,
  AnalysisMetric.Mean,
  AnalysisMetric.Min,
  AnalysisMetric.Max,
  AnalysisMetric.StdDev,
  AnalysisMetric.Quantile_99,
];

export const metricToGraphName = new Map<AnalysisMetric, string>([
  [AnalysisMetric.FrequentItems, 'Drift - frequent items'],
  [AnalysisMetric.Histogram, 'Drift - quantiles'],
  [AnalysisMetric.Count, 'Total count'],
  [AnalysisMetric.CountNull, 'Missing value count'],
  [AnalysisMetric.CountNullRatio, 'Missing value ratio'],
  [AnalysisMetric.UniqueEst, 'Estimated unique values'],
  [AnalysisMetric.UniqueEstRatio, 'Estimated unique ratio'],
  [AnalysisMetric.InferredDataType, 'Inferred data type'],
  [AnalysisMetric.InferredDataType, 'Inferred data type'],
  [AnalysisMetric.Median, 'Statistical - Est. median'],
  [AnalysisMetric.Mean, 'Statistical - Mean'],
  [AnalysisMetric.Min, 'Statistical - Min'],
  [AnalysisMetric.Max, 'Statistical - Max'],
  [AnalysisMetric.StdDev, 'Statistical - Std. dev'],
  [AnalysisMetric.Quantile_99, 'Statistical - P99'],
]);

export const backfillRangePickerParams: CustomRangeSearchParams = {
  startDateSearchParamKey: TEMP_START_DATE_RANGE,
  endDateSearchParamKey: TEMP_END_DATE_RANGE,
  dynamicPresetSearchParamKey: TEMP_RANGE_PRESET,
};

type MonitorTranslatorData = {
  selectItems: GenericFlexColumnSelectItemData[];
  monitorsMap: Map<string, MonitorInfo>;
  loading?: boolean;
};

export const getAnalyzerMetric = (an: Analyzer): AnalysisMetric => {
  const { config } = an;
  if (config.type === 'disjunction' || config.type === 'conjunction') return AnalysisMetric.Composed;
  return getAnalysisMetricByAnalyzerConfigMetric(config.metric);
};
export const useMonitorSelectTranslator = (
  resourceId: string,
  columnId: string,
  segment?: ParsedSegment,
): MonitorTranslatorData => {
  const [{ monitorSchema, analysisPreview }, dispatchAnalysis] = useContext(AnalysisContext);
  const { pageType } = usePageTypeWithParams();

  const cacheKey = (() => {
    const segmentString = segmentTagsToString(segment?.tags ?? []);
    return `${pageType}-${columnId}-${segmentString}`;
  })();

  const isCacheSynced = cacheKey === analysisPreview.monitorSelectCache?.key;

  const { data, loading } = useGetColumnActiveMonitorsQuery({
    variables: {
      resourceId,
      columnId,
      tags: segment?.tags,
    },
    skip: cacheKey === analysisPreview.monitorSelectCache?.key,
  });

  const createMonitorList = () => {
    const monitorsMap = new Map<string, MonitorInfo>();
    const selectItems: GenericFlexColumnSelectItemData[] = [];
    data?.columnMonitors?.forEach((monitorId) => {
      const hasMonitorInfo = monitorId ? monitorsMap.get(monitorId) : null;
      const monitorFromSchema = monitorSchema?.monitors?.find((m) => monitorId && m.id === monitorId);
      const analyzerFromSchema = monitorSchema?.analyzers?.find(
        (a) => a.id && monitorFromSchema?.analyzerIds.includes(a.id),
      );
      const metric = analyzerFromSchema ? getAnalyzerMetric(analyzerFromSchema) : null;
      const isSupportedMetric = SUPPORTED_PREVIEW_METRICS.find((m) => m === metric);
      const analyzerId = analyzerFromSchema?.id;
      if (!monitorId || hasMonitorInfo || !monitorFromSchema || !analyzerId || !metric || !isSupportedMetric) return;
      monitorsMap.set(monitorId, {
        monitorId,
        displayName: monitorFromSchema?.displayName,
        analyzerId,
        analyzerName: analyzerFromSchema?.displayName,
        metric,
        monitorConfig: monitorFromSchema,
        analyzerConfig: analyzerFromSchema!,
      });
      const monitorName = monitorFromSchema?.displayName || monitorId;
      const analyzerName = analyzerFromSchema?.displayName || analyzerId;
      selectItems.push({
        label: monitorFromSchema?.displayName || monitorId,
        group: metricToGraphName.get(metric) ?? 'Others',
        value: monitorId,
        rows: [
          {
            textElementConstructor: (children) => <SelectorRowText type="label">{children}</SelectorRowText>,
            children: monitorName,
            tooltip: monitorName,
          },
          {
            textElementConstructor: (children) => (
              <SelectorRowText type="secondary">Analyzer: {children}</SelectorRowText>
            ),
            children: analyzerName,
            tooltip: analyzerName,
          },
          {
            textElementConstructor: (children) => <SelectorRowText type="secondary">ID: {children}</SelectorRowText>,
            children: monitorId,
            tooltip: monitorId,
          },
        ],
        usedOnFilter: [monitorName, analyzerName, monitorId],
      });
      selectItems.sort((a, b) => (b.group && a.group ? a.group.localeCompare(b.group) : 0));
    });

    return { selectItems, monitorsMap };
  };

  if (!isCacheSynced && data && monitorSchema) {
    const newMonitorsList = createMonitorList();
    dispatchAnalysis({
      analysisPreview: {
        ...analysisPreview,
        monitorSelectCache: {
          key: cacheKey,
          data: newMonitorsList,
        },
      },
    });
  }

  return {
    selectItems: isCacheSynced ? analysisPreview.monitorSelectCache?.data?.selectItems ?? [] : [],
    monitorsMap: isCacheSynced ? analysisPreview.monitorSelectCache?.data?.monitorsMap ?? new Map() : new Map(),
    loading: !monitorSchema || loading,
  };
};

export const renderColumnText = (isOutputs: boolean, count: number): string => {
  const name = isOutputs ? 'output' : 'feature';
  return count === 1 ? name : `${name}s`;
};

export const isActiveBackfillJobStatus = (status: BackfillJobStatus): boolean =>
  [BackfillJobStatus.Pending, BackfillJobStatus.Planning, BackfillJobStatus.Executing].includes(status);

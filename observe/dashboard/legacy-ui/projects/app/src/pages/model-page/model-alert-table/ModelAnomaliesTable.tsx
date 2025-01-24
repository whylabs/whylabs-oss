import { useMemo, useCallback } from 'react';
import { AnomaliesTable } from 'components/controls/widgets/alerts-table/AnomaliesTable';
import { AlertCountWidget } from 'components/controls/widgets';
import { HeaderEmptyFillWidget } from 'components/controls/widgets/HeaderEmptyFillWidget';
import { Colors } from '@whylabs/observatory-lib';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { createStyles } from '@mantine/core';
import {
  AnalysisDataFragment,
  SortDirection,
  useGetMonitorConfigQuery,
  useGetPaginatedAnalysisResultsQuery,
  useGetAnomalyCountByAnalyzerQuery,
} from 'generated/graphql';
import { useSearchParams } from 'react-router-dom';
import { usePagingInfo } from 'hooks/usePagingInfo';
import useSort from 'hooks/useSort';
import { AnomalySortType, SortByKeys, SortDirectionKeys } from 'hooks/useSort/types';
import { stringToSchema } from 'utils/schemaUtils';
import { useRecoilState } from 'recoil';
import { emptyMonitorAtom } from 'atoms/emptyMonitorAtom';
import { AnalysisFiltersWidget } from 'components/controls/widgets/AnalysisFiltersWidget';
import { EventFeedFilterAtom } from 'atoms/eventFeedFilterAtom';
import { SelectCustomItems, WhyLabsMultiSelect, WhyLabsTableKit } from 'components/design-system';
import { Monitor } from 'generated/monitor-schema';
import { ANALYZER_FILTER } from 'types/navTags';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';
import { useSetHtmlTitle } from 'hooks/useSetHtmlTitle';

type MonitorWithRequiredId = Monitor & {
  id: string;
  analyzerIds: string[];
};

const {
  Footer: { Pagination },
} = WhyLabsTableKit;

const useContentAreaStyles = createStyles(() => ({
  columnCard: {
    display: 'flex',
    maxHeight: '100%',
    borderLeft: `1px solid ${Colors.brandSecondary200}`,
    backgroundColor: Colors.white,
    padding: '10px 20px',
    gap: '16px',
  },
  root: {
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    maxHeight: '100%',
    flexGrow: 1,
  },
  tableRoot: {
    height: '100%',
    backgroundColor: Colors.white,
  },
  flexRow: {
    display: 'flex',
    overflow: 'auto',
    flexShrink: 0,
  },
  monitorSelect: {
    backgroundColor: 'white',
    width: 300,
  },
}));

export interface ModelAnomaliesTableProps {
  readonly userCanManageMonitors: boolean;
}

export function ModelAnomaliesTable({ userCanManageMonitors }: ModelAnomaliesTableProps): JSX.Element {
  useSetHtmlTitle('Anomalies feed');

  const { sortBy, sortDirection, setSort } = useSort<AnomalySortType>(
    SortByKeys.sortAnomaliesBy,
    SortDirectionKeys.sortAnomaliesDirection,
  );
  const { pagingInfo, page } = usePagingInfo();
  const { classes } = useContentAreaStyles();
  const { dateRange, loading: loadingDateRange } = useSuperGlobalDateRange();
  const { modelId: datasetId } = usePageTypeWithParams();
  const [isEmptyMonitor] = useRecoilState(emptyMonitorAtom);
  const [{ anomaliesOnly, includeFailed, includeUnhelpful }] = useRecoilState(EventFeedFilterAtom);
  const [searchParams, setSearchParams] = useSearchParams();

  function onMonitorSelect(ids: string[] | null) {
    setSearchParams((nextParams) => {
      nextParams.delete(ANALYZER_FILTER);
      if (page !== 0) {
        nextParams.set('offset', '0');
      }
      ids?.forEach((id: string) => {
        nextParams.append(ANALYZER_FILTER, id);
      });
      return nextParams;
    });
  }

  const analyzerIdsFilter = searchParams.getAll(ANALYZER_FILTER);

  const { data, loading, error } = useGetPaginatedAnalysisResultsQuery({
    variables: {
      anomaliesOnly,
      includeFailed,
      includeUnhelpful,
      datasetId,
      ...dateRange,
      analyzerIDs: analyzerIdsFilter,
      limit: pagingInfo.limit,
      offset: pagingInfo.offset,
      sortDirection: sortDirection ?? SortDirection.Desc,
    },
    skip: loadingDateRange,
  });

  const { data: configuration, loading: configLoading } = useGetMonitorConfigQuery({
    variables: {
      modelId: datasetId,
    },
  });
  const schema = stringToSchema(configuration?.monitorConfig);
  const relevantAnalyzerIdList = useMemo(() => {
    return schema?.analyzers?.flatMap((a) => (a?.id ? [a.id] : [])) ?? [];
  }, [schema]);

  const {
    data: countData,
    loading: countDataLoading,
    error: countDataError,
  } = useGetAnomalyCountByAnalyzerQuery({
    variables: {
      datasetId,
      ...dateRange,
      analyzerIDs: relevantAnalyzerIdList,
    },
    skip: loadingDateRange,
  });

  const analyzersAnomalyCount = useMemo(() => {
    const map = new Map<string, number>();
    countData?.anomalyCountByAnalyzer?.forEach(({ analyzerId, anomalyCount }) => {
      if (!analyzerId) return;
      map.set(analyzerId, anomalyCount ?? 0);
    });
    return map;
  }, [countData?.anomalyCountByAnalyzer]);

  const getMonitorAnomalyCount = useCallback(
    (analyzerIds: string[]): number | undefined => {
      if (countDataError || countDataLoading) return undefined;
      return analyzerIds.reduce((acc, id) => acc + (analyzersAnomalyCount.get(id) ?? 0), 0);
    },
    [analyzersAnomalyCount, countDataError, countDataLoading],
  );

  const monitorOptions = useMemo(() => {
    return (
      schema?.monitors
        ?.filter((m): m is MonitorWithRequiredId => !!m.id && !!m.analyzerIds?.length)
        .map(({ displayName, id, analyzerIds }) => {
          const totalAnomalies = getMonitorAnomalyCount(analyzerIds) ?? 0;
          return {
            label: displayName ?? id,
            group: totalAnomalies ? 'Monitors with anomalies' : 'Monitors with no anomalies',
            value: analyzerIds[0],
            totalAnomalies,
            bottomText: id,
            analyzerIds,
          };
        })
        ?.sort((a, b) => b.totalAnomalies - a.totalAnomalies || a.label.localeCompare(b.label)) ?? []
    );
  }, [getMonitorAnomalyCount, schema?.monitors]);

  const selectedMonitors = analyzerIdsFilter?.length
    ? monitorOptions.filter((m) => analyzerIdsFilter.includes(m.value))
    : [];
  // Clear the selected monitor if it's not in the list of options
  if (!configLoading && analyzerIdsFilter?.length && !selectedMonitors?.length) {
    onMonitorSelect(null);
  }

  const analysisResults: AnalysisDataFragment[] = data?.paginatedAnalysisResults ?? [];

  if (error) console.error('Error fetching paginated analysis results', error);

  const getRowCount = () =>
    countData?.anomalyCountByAnalyzer?.reduce((acc, c) => {
      if (
        selectedMonitors?.length &&
        !selectedMonitors.some(({ analyzerIds }) => analyzerIds?.length && analyzerIds.includes(c?.analyzerId))
      ) {
        return acc;
      }
      return acc + ((anomaliesOnly ? c?.anomalyCount : c?.resultCount) ?? 0);
    }, 0) ?? 0;
  const renderFooter = () => {
    return <Pagination loading={loading || countDataLoading} rowCount={getRowCount()} renderingOutsideTable />;
  };
  return (
    <div className={classes.root}>
      <div className={classes.flexRow}>
        {!isEmptyMonitor && (
          <div className={classes.columnCard}>
            <div className={classes.monitorSelect}>
              <WhyLabsMultiSelect
                maxInputHeight={50}
                data={monitorOptions}
                itemComponent={SelectCustomItems.LabelWithLineBreakAndAnomalyCount}
                label="Filter by monitors"
                labelTooltip="Anomalies belonging to the filtered monitors will be shown"
                loading={configLoading}
                onChange={onMonitorSelect}
                placeholder="Select monitors"
                value={selectedMonitors?.map(({ value }) => value)}
              />
            </div>
            <AnalysisFiltersWidget />
          </div>
        )}
        {!isEmptyMonitor && <AlertCountWidget includeAllSegments analyzerIds={analyzerIdsFilter ?? []} />}
        <HeaderEmptyFillWidget />
      </div>
      <div className={classes.tableRoot}>
        <AnomaliesTable
          sortDirection={sortDirection}
          sortBy={sortBy}
          setSort={setSort}
          modelId={datasetId}
          data={analysisResults}
          error={error}
          loading={loading}
          schema={schema}
          userCanManageMonitors={userCanManageMonitors}
          anomaliesOnly={anomaliesOnly}
        />
      </div>
      {renderFooter()}
    </div>
  );
}

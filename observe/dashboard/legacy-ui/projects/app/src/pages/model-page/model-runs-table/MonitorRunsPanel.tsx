import { useState, useMemo } from 'react';
import { MonitorRunsTable } from 'pages/model-page/model-runs-table/MonitorRunsTable';
import { HeaderEmptyFillWidget } from 'components/controls/widgets/HeaderEmptyFillWidget';
import { Spacings, Colors } from '@whylabs/observatory-lib';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import {
  useGetAnalyzerRunsQuery,
  useGetMonitorConfigQuery,
  useGetAnalyzerRunCountQuery,
  SortDirection,
  AnalyzerRunResult,
} from 'generated/graphql';
import { usePagingInfo } from 'hooks/usePagingInfo';
import useSort from 'hooks/useSort';
import { AnomalySortType, SortByKeys, SortDirectionKeys } from 'hooks/useSort/types';
import { stringToSchema } from 'utils/schemaUtils';
import { useRecoilState } from 'recoil';
import { emptyMonitorAtom } from 'atoms/emptyMonitorAtom';
import { SearchSelect } from 'components/search-select/SearchSelect';
import { useSearchParams } from 'react-router-dom';
import { WhyLabsTableKit } from 'components/design-system';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';
import { createStyles } from '@mantine/core';
import { useSetHtmlTitle } from 'hooks/useSetHtmlTitle';

const {
  Footer: { Pagination },
} = WhyLabsTableKit;

const useContentAreaStyles = createStyles({
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
  headerRoot: {
    display: 'flex',
    height: `${Spacings.tabContentHeaderHeight}px`,
  },
  monitorSelect: {
    paddingLeft: '10px',
    paddingRight: '10px',
    backgroundColor: 'white',
  },
});

export interface MonitorRunsPanelProps {
  readonly userCanManageMonitors: boolean;
}

export function MonitorRunsPanel({ userCanManageMonitors }: MonitorRunsPanelProps): JSX.Element {
  useSetHtmlTitle('Monitor runs');
  const { sortBy, sortDirection, setSort } = useSort<AnomalySortType>(
    SortByKeys.sortAnomaliesBy,
    SortDirectionKeys.sortAnomaliesDirection,
  );
  const { pagingInfo, page } = usePagingInfo();
  const [searchParams, setSearchParams] = useSearchParams();
  const { classes } = useContentAreaStyles();
  const { dateRange, loading: loadingDateRange } = useSuperGlobalDateRange();
  const pt = usePageTypeWithParams();
  const { modelId: datasetId } = pt;
  const [selectedMonitorId, setSelectedMonitorId] = useState<string | undefined>(
    searchParams.get('monitor') || undefined,
  );
  const [isEmptyMonitor] = useRecoilState(emptyMonitorAtom);

  function onMonitorSelect(id: string | undefined) {
    setSearchParams((nextSearchParam) => {
      if (page !== 0) {
        nextSearchParam.set('offset', '0');
      }
      if (nextSearchParam.has('monitor')) {
        nextSearchParam.delete('monitor');
      }
      if (id) {
        nextSearchParam.set('monitor', id);
      }

      return nextSearchParam;
    });

    setSelectedMonitorId(id);
  }

  const { data, loading, error } = useGetAnalyzerRunsQuery({
    variables: {
      datasetId,
      ...dateRange,
      monitorId: selectedMonitorId,
      limit: pagingInfo.limit,
      offset: pagingInfo.offset,
      sortDirection: sortDirection ?? SortDirection.Desc,
    },
    skip: loadingDateRange,
  });

  const { data: countData } = useGetAnalyzerRunCountQuery({
    variables: {
      datasetId,
      ...dateRange,
      monitorId: selectedMonitorId,
    },
    skip: loadingDateRange,
  });

  const { data: configuration, loading: configLoading } = useGetMonitorConfigQuery({
    variables: {
      modelId: datasetId,
    },
  });
  const schema = stringToSchema(configuration?.monitorConfig);

  const monitorOptions = useMemo(() => {
    return (
      schema?.monitors.map((m) => {
        return {
          label: m.displayName ?? (m.id as string),
          value: m.id as string,
        };
      }) ?? []
    );
  }, [schema?.monitors]);
  const selectedMonitor = selectedMonitorId ? monitorOptions.find((m) => m.value === selectedMonitorId) : undefined;

  const analysisResults: AnalyzerRunResult[] = data?.analyzerRuns ?? [];

  if (error) {
    console.error(error);
  }
  if (pt.pageType !== 'monitorManagerMonitorRuns') {
    console.log(`Attempted to show monitor runs table on page ${pt.pageType}`);
  }

  const getRowCount = () => countData?.runCount?.count ?? 0;

  const renderFooter = () => {
    return <Pagination loading={loading} rowCount={getRowCount()} renderingOutsideTable />;
  };

  return (
    <div className={classes.root}>
      <div className={classes.headerRoot}>
        {!isEmptyMonitor && (
          <div className={classes.monitorSelect}>
            <SearchSelect
              selectedOption={selectedMonitor}
              onChange={onMonitorSelect}
              selectString="Select monitor"
              allowUndefined
              filterString="Filter by monitor"
              tooltip="Anomalies belonging to the filtered monitor will be shown"
              loading={configLoading}
              options={monitorOptions}
            />
          </div>
        )}
        <HeaderEmptyFillWidget />
      </div>
      <div className={classes.tableRoot}>
        <MonitorRunsTable
          sortDirection={sortDirection}
          sortBy={sortBy}
          setSort={setSort}
          modelId={datasetId}
          data={analysisResults}
          error={!!error}
          loading={loading}
          schema={schema}
          userCanManageMonitors={userCanManageMonitors}
        />
      </div>
      {renderFooter()}
    </div>
  );
}

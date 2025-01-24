import { createStyles, Skeleton } from '@mantine/core';
import { usePageType } from 'pages/page-types/usePageType';
import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { WhyLabsTableKit, WhyLabsTooltip } from 'components/design-system';
import { Colors, RedAlertBall } from '@whylabs/observatory-lib';
import { friendlyFormat } from 'utils/numberUtils';
import { arrayOfLength } from 'utils/arrayUtils';
import useSort from 'hooks/useSort';
import { AllAccessors, ModelSortBy, SortByKeys, SortDirectionKeys, SortDirectionType } from 'hooks/useSort/types';
import { useCallback, useState } from 'react';
import { formatDistance } from 'date-fns';
import { SortDirection } from 'generated/graphql';
import { yearMonthDay, getFormattedDateRangeString } from 'utils/dateUtils';
import { upperCaseFirstLetterOnly } from 'utils/stringUtils';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';
import { TableColumnHorizontalAlign } from 'components/design-system/responsive-table/tableUtils';
import GreenHappyBall from 'components/controls/GreenHappyBall';
import { ResourcesTableInfo, TABLE_COLUMNS_SIZE } from './resourcesTableUtils';
import { useResourcesFetchTableData } from './useResourcesFetchTableData';

const {
  Components: WhyLabsTable,
  Cells: { LinkCell, TextCell, HeaderCell, SortableHeaderCell },
} = WhyLabsTableKit;

const useStyles = createStyles(() => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    backgroundColor: 'white',
    height: '100%',
    position: 'relative',
  },
  table: {
    '&[data-hover] tbody tr:hover': {
      '& td *': {
        fontWeight: 600,
      },
    },
  },
  textCell: {
    fontFamily: 'Asap',
    color: Colors.brandSecondary900,
    fontSize: 14,
    padding: '0 8px',
  },
  noAnomaliesText: {
    fontSize: 13,
    lineHeight: 1,
    fontStyle: 'italic',
    color: Colors.brandSecondary700,
  },
  noData: {
    height: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    '& span': {
      fontSize: '16px',
    },
  },
  noDataText: {
    fontFamily: 'Asap',
    fontSize: '13px',
    fontWeight: 400,
    fontStyle: 'italic',
    color: Colors.brandSecondary700,
    padding: '0 8px',
  },
  rowCell: {
    height: '60px',
    display: 'flex',
    alignItems: 'center',
  },
  dataRow: {
    color: Colors.gray900,
    fontSize: 13,
    fontFamily: 'Inconsolata',
    textWrap: 'nowrap',
  },
  cellPadding: {
    padding: '8px',
  },
  anomaliesCell: {
    width: 'fit-content',
  },
  buttonCell: {
    display: 'block',
    textDecoration: 'none',
    color: Colors.linkColor,
    '&:hover': {
      textDecoration: 'underline',
      color: Colors.chartPrimary,
    },
  },
}));

const accessorsMapper = new Map<ModelSortBy, AllAccessors<ResourcesTableInfo>>([
  ['Name', ['name']],
  ['Freshness', ['dataAvailability', 'latestAnomalyTimestamp']],
  ['AnomaliesInRange', ['totalAnomaliesCount']],
]);

export const ResourcesTableView: React.FC = () => {
  const pageType = usePageType();
  const isModel = pageType === 'modelsSummary';
  const { classes, cx } = useStyles();
  const { handleNavigation } = useNavLinkHandler();
  const { getNavUrl } = useNavLinkHandler();
  const { resourcesData } = useResourcesFetchTableData(isModel);
  const tableData = resourcesData.data;
  const [prevData, setPrevData] = useState<ResourcesTableInfo[]>();
  const [sortedData, setSortedData] = useState<ResourcesTableInfo[]>();
  const { dateRange } = useSuperGlobalDateRange();
  const rangeString = getFormattedDateRangeString(dateRange, false);

  const { sortDirection, sortBy, handleSort } = useSort<ModelSortBy>(
    SortByKeys.sortModelBy,
    SortDirectionKeys.sortModelDirection,
  );

  const sortData = useCallback(
    (
      nextSortDirection: SortDirectionType,
      newSortBy: ModelSortBy = 'AnomaliesInRange',
      accessors: AllAccessors<ResourcesTableInfo> = [],
    ) => {
      const defaultAccessors = accessorsMapper.get(newSortBy) ?? [];
      const usedAccessors = accessors?.length ? accessors : defaultAccessors;
      setSortedData(handleSort<ResourcesTableInfo>(tableData, nextSortDirection, newSortBy, usedAccessors));
    },
    [handleSort, tableData],
  );

  // Sort data initially
  if (prevData !== tableData) {
    setPrevData(tableData);
    sortData(sortDirection ?? SortDirection.Desc, sortBy);
  }

  const TableSkeleton = () => {
    return (
      <div className={classes.root} style={{ overflow: 'hidden' }}>
        {arrayOfLength(20).map((i) => (
          <div style={{ display: 'flex', marginTop: 1 }} key={`skeleton-item-${i}`}>
            <Skeleton height={35} width={350} mr={2} />
            <Skeleton height={35} width="calc(100% - 350px)" />
          </div>
        ))}
      </div>
    );
  };

  if (resourcesData.loading) {
    return TableSkeleton();
  }

  const renderDateRangeString = (oldest?: number, latest?: number) => {
    if (oldest && latest && oldest !== latest) {
      const oldestString = yearMonthDay(oldest ?? 0) ?? '-';
      const latestString = yearMonthDay(latest ?? 0) ?? '-';
      return `${oldestString} to ${latestString}`;
    }
    return '-';
  };

  return (
    <div className={classes.root}>
      {sortedData?.length ? (
        <WhyLabsTable.Container
          isLoading={resourcesData.loading}
          rowsCount={resourcesData.loading ? 0 : sortedData.length}
          className={classes.table}
          fixedFirstColumn
          headerHeight={34}
        >
          <WhyLabsTable.Column
            uniqueKey="resourceName"
            {...TABLE_COLUMNS_SIZE.resourceName}
            header={
              <SortableHeaderCell
                sortType="text"
                tooltipText="Resource name"
                sortDirection={sortBy === 'Name' ? sortDirection : undefined}
                onSortDirectionChange={(newSortDir) => sortData(newSortDir, 'Name', ['name'])}
              >{`${pageType === 'modelsSummary' ? 'Model' : 'Dataset'} name`}</SortableHeaderCell>
            }
            cell={(rowIndex) => {
              const { id, name } = sortedData[rowIndex]!;
              return (
                <LinkCell
                  to={getNavUrl({
                    page: 'summary',
                    modelId: id,
                  })}
                  className={cx(classes.dataRow, classes.cellPadding, classes.buttonCell)}
                >
                  {name}
                </LinkCell>
              );
            }}
          />
          <WhyLabsTable.Column
            uniqueKey="anomalies"
            {...TABLE_COLUMNS_SIZE.anomalies}
            header={
              <SortableHeaderCell
                sortType="number"
                sortDirection={sortBy === 'AnomaliesInRange' ? sortDirection : undefined}
                onSortDirectionChange={(newSortDir) =>
                  sortData(newSortDir, 'AnomaliesInRange', ['totalAnomaliesCount'])
                }
              >
                {`Anomalies: ${rangeString}`}
              </SortableHeaderCell>
            }
            horizontalAlign={TableColumnHorizontalAlign.Right}
            cell={(rowIndex) => {
              const { id, totalAnomaliesCount } = sortedData[rowIndex];
              const navToAnomaliesFeed = () => {
                handleNavigation({
                  modelId: id,
                  page: 'monitorManager',
                  monitorManager: { path: 'anomalies-feed' },
                });
              };
              return (
                <div className={classes.anomaliesCell}>
                  <WhyLabsTooltip label={totalAnomaliesCount ? 'View in anomalies feed' : ''}>
                    {totalAnomaliesCount ? (
                      <RedAlertBall alerts={totalAnomaliesCount} inverted onClick={navToAnomaliesFeed} />
                    ) : (
                      <GreenHappyBall inverted />
                    )}
                  </WhyLabsTooltip>
                </div>
              );
            }}
          />
          <WhyLabsTable.Column
            uniqueKey="profileLineage"
            {...TABLE_COLUMNS_SIZE.profileLineage}
            header={<HeaderCell>Profile lineage</HeaderCell>}
            cell={(rowIndex) => {
              const { dataAvailability } = sortedData[rowIndex];
              const { oldestTimestamp, latestTimestamp } = dataAvailability;
              if (!oldestTimestamp && !latestTimestamp) {
                return <TextCell className={classes.noDataText}>No batch profiles found</TextCell>;
              }
              return (
                <TextCell className={cx(classes.dataRow, classes.cellPadding)}>
                  {renderDateRangeString(oldestTimestamp ?? 0, latestTimestamp ?? 0)}
                </TextCell>
              );
            }}
          />
          <WhyLabsTable.Column
            uniqueKey="freshness"
            {...TABLE_COLUMNS_SIZE.freshness}
            header={
              <SortableHeaderCell
                sortType="number"
                sortDirection={sortBy === 'Freshness' ? sortDirection : undefined}
                onSortDirectionChange={(newSortDir) =>
                  sortData(newSortDir, 'Freshness', ['dataAvailability', 'latestTimestamp'])
                }
              >
                Freshness
              </SortableHeaderCell>
            }
            cell={(rowIndex) => {
              const { dataAvailability } = sortedData[rowIndex];
              const timestamp = dataAvailability?.latestTimestamp;
              if (!timestamp) {
                return <TextCell className={classes.noDataText}>No profiles found</TextCell>;
              }
              return (
                <TextCell className={cx(classes.dataRow, classes.cellPadding)}>
                  {upperCaseFirstLetterOnly(formatDistance(timestamp, new Date(), { addSuffix: true }))}
                </TextCell>
              );
            }}
          />
          <WhyLabsTable.Column
            uniqueKey="volume"
            {...TABLE_COLUMNS_SIZE.volume}
            header={
              <SortableHeaderCell
                sortType="number"
                sortDirection={sortBy === 'Volume' ? sortDirection : undefined}
                onSortDirectionChange={(newSortDir) => sortData(newSortDir, 'Volume', ['inputVolume'])}
              >
                {`Total volume: ${rangeString}`}
              </SortableHeaderCell>
            }
            horizontalAlign={TableColumnHorizontalAlign.Right}
            cell={(rowIndex) => {
              const { inputVolume } = sortedData[rowIndex];
              return (
                <TextCell className={cx(classes.dataRow, classes.cellPadding)}>
                  {friendlyFormat(inputVolume, 1)}
                </TextCell>
              );
            }}
          />
          {isModel && (
            <WhyLabsTable.Column
              uniqueKey="performance"
              {...TABLE_COLUMNS_SIZE.performance}
              header={<HeaderCell>Performance</HeaderCell>}
              cell={(rowIndex) => {
                const { performance } = sortedData[rowIndex];
                return (
                  <TextCell className={cx(classes.dataRow, classes.cellPadding)}>
                    {performance ? `${performance.metric}: ${performance.value}` : '-'}
                  </TextCell>
                );
              }}
            />
          )}
        </WhyLabsTable.Container>
      ) : (
        <div className={classes.noData}>
          <span>No {isModel ? 'models' : 'datasets'} found</span>
        </div>
      )}
    </div>
  );
};

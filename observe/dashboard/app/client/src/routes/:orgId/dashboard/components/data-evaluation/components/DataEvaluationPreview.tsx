import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import { CategoricalChart } from '~/components/chart/CategoricalChart';
import { ChartCard } from '~/components/chart/ChartCard';
import { SkeletonGroup, WhyLabsTableKit, WhyLabsText } from '~/components/design-system';
import { PAGINATION_ROOT_HEIGHT } from '~/components/design-system/responsive-table/footer/WhyLabsTablePagination';
import { TableColumnHorizontalAlign } from '~/components/design-system/responsive-table/tableUtils';
import { SINGLE_HEADER_TOP_CONTAINER_HEIGHT } from '~/constants/styleConstants';
import { generateMetricGraphTickPositions } from '~/routes/:orgId/:resourceId/segment-analysis/utils';
import {
  EvaluationGraph,
  translateEvaluationDataToGraphs,
} from '~/routes/:orgId/dashboard/components/data-evaluation/components/utils';
import { BUILDER_BOTTOM_CONTROLS_HEIGHT } from '~/routes/:orgId/dashboard/components/WidgetBuilderLayout';
import { TABLE_HEADER_HEIGHT } from '~/utils/constants';
import { MetricDataType } from '~server/graphql/generated/graphql';
import React, { Fragment, ReactElement, useMemo } from 'react';

import { DataEvaluationBuilderChild } from '../useDataEvaluationBuilderViewModel';
import { PreviewTopControls } from './PreviewTopControls';
import { TEXT_CELLS, useDataEvaluationPreviewViewModel } from './useDataEvaluationPreviewViewModel';

const {
  Components: WhyLabsTable,
  Cells: { SortableHeaderCell },
  Footer: { Pagination },
} = WhyLabsTableKit;

const TABLE_ROWS_HEIGHT = 35;
const TABLE_BOTTOM_BUFFER = 36;
const EVALUATION_TABLE_TOP_OFFSET = 14 + 36 + 15 + 30 + 10; // container padding, widget name, margin, top controls height and gap.
const BORDER_WIDTH = 1;
const DASH_CARD_MAX_TABLE_HEIGHT = 800;
const PAGINATION_OPTIONS = [5, 10, 25, 50, 100];

const TABLE_BORDER = `${BORDER_WIDTH}px solid ${Colors.secondaryLight200}`;
const useStyles = createStyles(
  (
    _,
    {
      isEditWidgetPage,
      displayControls,
      pageSize,
    }: { isEditWidgetPage: boolean; displayControls: boolean; pageSize: number },
  ) => {
    const getTableHeight = () => {
      const tableContentHeight = Math.max(
        pageSize * TABLE_ROWS_HEIGHT + (TABLE_HEADER_HEIGHT + PAGINATION_ROOT_HEIGHT + 2 * BORDER_WIDTH),
        150,
      );
      if (isEditWidgetPage) {
        return `min(calc(100dvh - ${SINGLE_HEADER_TOP_CONTAINER_HEIGHT}px - ${BUILDER_BOTTOM_CONTROLS_HEIGHT}px - ${
          EVALUATION_TABLE_TOP_OFFSET + TABLE_BOTTOM_BUFFER
        }px), ${tableContentHeight}px)`;
      }
      const fallbackMinHeight = displayControls ? 450 : 250;
      return `max(${fallbackMinHeight}px, ${Math.min(tableContentHeight, DASH_CARD_MAX_TABLE_HEIGHT)}px)`;
    };
    return {
      root: {
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        width: '100%',
        overflow: 'hidden',
      },
      tableWrapper: {
        display: 'flex',
        height: getTableHeight(),
        justifyContent: 'space-between',
        position: 'relative',
        width: '100%',
        flexDirection: 'column',
        borderLeft: TABLE_BORDER,
        borderRight: TABLE_BORDER,
      },
      header: {
        color: Colors.black,
        fontWeight: 600,
        textWrap: 'nowrap',
      },
      emptyResponseState: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.secondaryLight100,
        borderRadius: '0 0 4px 4px',
        color: Colors.secondaryLight1000,
        fontSize: 16,
        fontWeight: 400,
        flex: 1,
      },
      tableLoadingContainer: {
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        background: 'white',
      },
      graphsContainer: {
        display: 'flex',
        flexDirection: 'column',
        overflow: 'auto',
        gap: 10,
        minHeight: 150,
      },
      graphCard: {
        maxHeight: 400,
        minHeight: 265,
        width: '100%',
        padding: 0,
        paddingTop: 5,
        flexShrink: 0,
        borderWidth: '1px 0px',
        borderTop: 'unset',
        borderRadius: 0,
      },
      titleContainer: {
        marginBottom: 0,
      },
      graphTitle: {
        fontSize: 14,
        fontWeight: 500,
        color: Colors.brandSecondary900,
      },
    };
  },
);

export const DataEvaluationPreview = ({ parentViewModel }: DataEvaluationBuilderChild): ReactElement => {
  const { isEditWidgetPage, viewMode, queryParams } = parentViewModel;
  const {
    table,
    highlightState,
    tableUserDefinedColumns,
    isSegmentColumnDefinition,
    mapMetricByValue,
    downloadTableData,
  } = useDataEvaluationPreviewViewModel({ parentViewModel });
  const fetchedTablePageSize = Math.min(table.pagingInfo.limit, table.allTableData.length);
  const displayControls = parentViewModel.displaySideControls.value;
  const { classes } = useStyles({
    isEditWidgetPage,
    displayControls,
    pageSize: fetchedTablePageSize,
  });
  const shouldDisplayPagination = !table.loading && !!table.allTableData.length;

  const renderNoDataState = () => {
    if (table.loading || table.allTableData.length) return null;
    return (
      <div className={classes.emptyResponseState}>
        {table.error ? (
          <>
            <div>Some error happened while fetching the evaluation data.</div>
            <div>WhyLabs was notified and will take care of it.</div>
          </>
        ) : (
          'No results for the selected data controls'
        )}
      </div>
    );
  };

  const renderTable = () => {
    return (
      <div className={classes.tableWrapper}>
        <WhyLabsTable.Container
          headerHeight={TABLE_HEADER_HEIGHT}
          rowsHeight={TABLE_ROWS_HEIGHT}
          rowsCount={table.data.length}
          withBorder={false} // border are added to the table container
        >
          {table.getColumns().map(({ headerText, columnKey, sortType, ...rest }) => {
            return (
              <WhyLabsTable.Column
                key={columnKey}
                columnKey={columnKey}
                horizontalAlign={
                  TEXT_CELLS.includes(columnKey) ? TableColumnHorizontalAlign.Left : TableColumnHorizontalAlign.Right
                }
                header={
                  <SortableHeaderCell
                    columnKey={columnKey}
                    className={classes.header}
                    tooltipText={headerText}
                    {...table.getSortableHeaderProps(columnKey, sortType)}
                  >
                    {headerText}
                  </SortableHeaderCell>
                }
                {...rest}
              />
            );
          })}
        </WhyLabsTable.Container>
        {table.loading && renderTableLoading()}
        {renderNoDataState()}
        {shouldDisplayPagination && (
          <Pagination
            customSizeOptions={PAGINATION_OPTIONS}
            customPaginationState={table.customPaginationState}
            renderingOutsideTable
            rowCount={table.allTableData.length}
          />
        )}
      </div>
    );
  };

  const renderTableLoading = () => {
    return (
      <div className={classes.tableLoadingContainer}>
        <SkeletonGroup count={10} width="100%" height={34} mb={2} />{' '}
      </div>
    );
  };

  const isMetricComparison = parentViewModel.widgetType === 'metricComparison';

  const renderGraph = (g: EvaluationGraph) => {
    const graphMetric = mapMetricByValue.get(g.metricLabel);
    const metricLabel = graphMetric?.label ?? g.metricLabel;
    const displayedLabel = metricLabel.concat(g.metricLabel !== g.numericMetric ? `.${g.numericMetric}` : '');
    return (
      <Fragment key={g.metricLabel}>
        <ChartCard
          classNames={{
            root: classes.graphCard,
            titleContainer: classes.titleContainer,
          }}
          title={
            isMetricComparison ? <WhyLabsText className={classes.graphTitle}>{displayedLabel}</WhyLabsText> : undefined
          }
        >
          <CategoricalChart
            isLoading={table.loading}
            description="Evaluation data plotted on columns graph"
            series={g.series}
            categories={g.categories}
            height={graphs.length > 1 ? 300 : 350}
            spec={{
              xAxis: {
                allowZooming: true,
                title: isSegmentColumnDefinition ? 'Segments' : 'Metric targets',
                crosshair: true,
              },
              plotOptions: {
                columnStackingMode: null,
              },
              yAxis: [
                {
                  title: displayedLabel,
                  ...(graphMetric
                    ? {
                        tickPositioner() {
                          const { unitInterval, dataType } = graphMetric ?? {};
                          const integerDataType = dataType === MetricDataType.Integer;
                          // @ts-expect-error - its an valid value as in https://api.hcplaceholder.com/hcplaceholder/xAxis.tickPositioner
                          const { dataMax, dataMin } = this;
                          return generateMetricGraphTickPositions({
                            dataMin,
                            dataMax,
                            ticksAmount: 4,
                            isUnitInterval: unitInterval ?? undefined,
                            integerDataType,
                          });
                        },
                      }
                    : {}),
                },
              ],
            }}
          />
        </ChartCard>
      </Fragment>
    );
  };

  const renderGraphsSkeleton = () => {
    const selectedMetricsCount =
      (queryParams?.dataSource?.metrics?.length ?? 1) * (queryParams?.dataSource?.resourceColumns?.length ?? 1);
    const skeletonCount = Math.min(selectedMetricsCount, 2); // max of 2 graph skeletons
    return <SkeletonGroup count={skeletonCount} width="100%" height={skeletonCount > 1 ? 320 : 400} />;
  };

  const graphs = useMemo(
    () =>
      translateEvaluationDataToGraphs(
        table.allTableData,
        tableUserDefinedColumns ?? [],
        parentViewModel.widgetType,
      ).sort((a, b) =>
        (mapMetricByValue.get(a.metricLabel)?.label ?? a.metricLabel).localeCompare(
          mapMetricByValue.get(b.metricLabel)?.label ?? b.metricLabel,
        ),
      ),
    [mapMetricByValue, parentViewModel.widgetType, table.allTableData, tableUserDefinedColumns],
  );

  return (
    <div className={classes.root}>
      <PreviewTopControls
        parentViewModel={parentViewModel}
        highlightState={highlightState}
        metricsLabelMap={mapMetricByValue}
        downloadDataFn={downloadTableData}
      />
      {viewMode.value === 'table' ? (
        renderTable()
      ) : (
        <div className={classes.graphsContainer}>
          {renderNoDataState()}
          {table.loading ? renderGraphsSkeleton() : graphs.map(renderGraph)}
        </div>
      )}
    </div>
  );
};

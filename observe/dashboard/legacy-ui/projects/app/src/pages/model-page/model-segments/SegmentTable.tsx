import { useState } from 'react';
import useTypographyStyles from 'styles/Typography';
import { Typography } from '@material-ui/core';
import { createStyles } from '@mantine/core';
import { LinkCell, Colors, HtmlTooltip, TableLoading, HeaderCell, NoDataMessage } from '@whylabs/observatory-lib';
import { Column, Table } from 'fixed-data-table-2';
import { OverviewTimeSeriesFragment, SegmentsListingTableQuery, SegmentSortBy, SortDirection } from 'generated/graphql';
import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { getSegmentTags } from 'pages/page-types/pageUrlQuery';
import AnomaliesInRangeCell from 'components/controls/widgets/alerts-table/cells/AnomaliesInRangeCell';
import { ApolloError } from '@apollo/client';
import { SparklineChart } from 'components/visualizations/sparkline-chart/SparklineChart';
import { SortDirectionType } from 'hooks/useSort/types';
import { NumberCountCell } from 'components/controls/table/cells/NumberCountCell';
import { InputOutputMap, useInputOutputCountFromSegmentBatches } from 'hooks/useInputOutputCountFromSegmentBatches';
import { createCommonTexts } from 'strings/commonTexts';
import { WhyLabsTableKit } from 'components/design-system';
import { getParam } from 'pages/page-types/usePageType';
import { FilterKeys } from 'hooks/useFilterQueryString';
import HeaderCellSortSelect from '../HeaderCellSortSelect';
import { useResourceText } from '../hooks/useResourceText';
import UnexpectedErrorPage from '../../model-not-found/UnexpectedErrorPage';

export const SEGMENT_DEFAULT_LIMIT = 30;

const {
  Footer: { Pagination },
} = WhyLabsTableKit;

const COMMON_TEXTS = createCommonTexts({
  anomaliesInRange: 'Anomalies in range',
  anomaliesInRangeTooltip: 'A visualization and count of the total anomalies occurring in the applied time range',
  count: 'count',
  countTotal: 'count total',
  inputsTooltip:
    'The total number of input records from segments that are consumed by the model over the selected date range',
  segments: 'Segments',
  sortingDisabled: `This column's sorting is disabled for more than ${SEGMENT_DEFAULT_LIMIT} segments`,
});

const PAGE_TEXTS = {
  DATA: {
    ...COMMON_TEXTS,
    inputs: 'Columns',
    outputs: '', // Dataset has no outputs
    outputsTooltip: ',', // Dataset has no outputs
    segmentsTooltip: 'The subset of the overall dataset with the specified column and value constraints',
  },
  MODEL: {
    ...COMMON_TEXTS,
    inputs: 'Inputs',
    outputs: 'Outputs',
    outputsTooltip: 'The total number of outputs records from the model for segments over the selected date range',
    segmentsTooltip: 'The subset of the overall dataset with the specified feature and value constraints',
  },
  LLM: {
    ...COMMON_TEXTS,
    inputs: 'Metrics',
    outputs: 'Metrics',
    outputsTooltip: 'The total number of metrics records from the model for segments over the selected date range',
    segmentsTooltip: 'The subset of the overall dataset with the specified metric and value constraints',
  },
};

const useStyles = createStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    flexBasis: '100px',
    flexGrow: 1,
    width: '100%',
  },
  nameA: {
    textDecoration: 'none',
    color: 'inherit',
  },
  stuffContainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxHeight: 40,
    width: '100%',
  },
  abbreviatedCell: {
    textOverflow: 'ellipsis',
    maxWidth: '19em',
    lineHeight: 1.5,
    paddingTop: '10px',
    paddingBottom: '2px',
  },
  hoveredCellBack: {
    backgroundColor: Colors.brandSecondary100,
  },

  cellBack: {
    backgroundColor: Colors.white,
  },
  cellBody: {
    maxHeight: 40,
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    paddingLeft: '10px !important',
  },
  linkUpdate: {
    textUnderlinePosition: 'under',
  },
  noColorText: {
    fontStyle: 'italic',
    color: Colors.brandSecondary700,
    paddingRight: 0,
    width: 160,
  },
});

type InputOutputObject = {
  y: number;
  date: number;
};

// TODO: Temporary front-end sorting that must be removed once the backend implements it
enum MissingOnBackEndSegmentSortBy {
  InputCount = 'InputCount',
  OutputCount = 'OutputCount',
}

export type TempSegmentSortBy = SegmentSortBy | MissingOnBackEndSegmentSortBy;

type TableData = {
  inputData: InputOutputMap;
  outputData: InputOutputMap;
  tags: { key: string; value: string }[];
  timeseries: OverviewTimeSeriesFragment[];
};

export interface SegmentTableProps {
  data: SegmentsListingTableQuery | undefined;
  error: ApolloError | undefined;
  loading: boolean;
  modelId: string;
  onSortDirectionChange: (sortDirection: SortDirectionType, sortBy: TempSegmentSortBy) => void;
  sortBy: TempSegmentSortBy | undefined;
  sortDirection: SortDirectionType;
  width: number;
  height: number;
}

const SPARKLINE_DATE_KEY = 'date';

export function SegmentTable({
  data,
  error,
  loading,
  modelId,
  onSortDirectionChange,
  sortBy,
  sortDirection,
  width,
  height,
}: SegmentTableProps): JSX.Element | null {
  const { getNavUrl } = useNavLinkHandler();
  const { classes: styles, cx } = useStyles();
  const [hoveredRow, setHoveredRow] = useState(-1);
  const { classes: typography } = useTypographyStyles();
  const searchTerm = getParam(FilterKeys.searchString);

  const segmentData = data?.model?.segments ?? [];
  const totalSegments = data?.model?.totalFilteredSegments ?? 0;

  const batchFrequency = data?.model?.batchFrequency;

  const { resourceTexts, isModelCategory } = useResourceText(PAGE_TEXTS);

  const { inputData, outputData } = useInputOutputCountFromSegmentBatches({
    batchFrequency,
    segmentData,
  });

  if (error || (!data?.model && !loading)) {
    console.error(`Error fetching segments for segment listing table: ${JSON.stringify(error)}`);
    return <UnexpectedErrorPage />;
  }

  if (loading) return <TableLoading />;

  const tableItems = getTableItems();

  const segmentTagsLinter = (tags: Array<string>) => {
    if (tags.length < 1) return [''];

    if (tags[0].includes('key=') && tags[1]?.includes('value=')) {
      const tempTag = tags;
      tempTag[0] = tags[0]?.replace('key=', '');
      tempTag[1] = tags[1]?.replace('value=', '');

      const lintedTag = tempTag.join('=');

      return [lintedTag];
    }

    const lintedTag = tags.join(' | ');

    return [lintedTag];
  };

  if (!tableItems.length) {
    return (
      <NoDataMessage>
        <Typography>{resourceTexts.noDataFound}</Typography>
      </NoDataMessage>
    );
  }
  const showPagination = totalSegments > SEGMENT_DEFAULT_LIMIT;

  // TODO: this is a hack until we rework this table to use the new table kit
  // 52 comes from the ROOT_HEIGHT from WhyLabsTablePagination.tsx
  const tableHeight = showPagination ? height - 52 : height;
  return (
    <div className={styles.root}>
      <Table
        rowHeight={40}
        headerHeight={40}
        rowsCount={tableItems.length}
        width={width}
        height={tableHeight}
        touchScrollEnabled
        onRowMouseEnter={(_, rowIndex: number) => {
          setHoveredRow(rowIndex);
        }}
      >
        <Column
          header={
            <HeaderCellSortSelect
              header={resourceTexts.segments}
              renderTooltip={() => <HtmlTooltip tooltipContent={resourceTexts.segmentsTooltip} />}
              sortDirection={sortDirectionFor(SegmentSortBy.Name)}
              onSortDirectionChange={onSortDirectionChangeFor(SegmentSortBy.Name)}
            />
          }
          fixed
          cell={({ rowIndex }) => {
            const segment = tableItems[rowIndex];
            const segmentTags = segmentTagsLinter(getSegmentTags(segment));

            return (
              <LinkCell
                maxChars={66}
                className={cx(typography.monoFont, styles.linkUpdate)}
                to={getNavUrl({
                  page: 'columns',
                  modelId,
                  segmentTags: segment,
                  saveParams: ['offset', 'limit'],
                })}
                withTooltip
                searchTerm={searchTerm ?? ''}
              >
                {segmentTags}
              </LinkCell>
            );
          }}
          flexGrow={1}
          width={500}
        />
        <Column
          columnKey="alertsByTime"
          header={
            <HeaderCellSortSelect
              header={resourceTexts.anomaliesInRange}
              renderTooltip={() => <HtmlTooltip tooltipContent={resourceTexts.anomaliesInRangeTooltip} />}
              sortDirection={sortDirectionFor(SegmentSortBy.AnomalyCount)}
              onSortDirectionChange={onSortDirectionChangeFor(SegmentSortBy.AnomalyCount)}
            />
          }
          cell={({ rowIndex }) => (
            <AnomaliesInRangeCell
              noDataText={
                <Typography className={cx(styles.noColorText, typography.monoFont)}>
                  {resourceTexts.noAnomaliesData}
                </Typography>
              }
              timeSeries={tableItems[rowIndex].timeseries}
              viewMode="table"
            />
          )}
          width={300}
        />

        {renderInputOutputColumn('Input', resourceTexts.inputsTooltip)}

        {isModelCategory && renderInputOutputColumn('Output', resourceTexts.outputsTooltip)}

        {renderInputOutputTotalColumn('Input', MissingOnBackEndSegmentSortBy.InputCount)}

        {isModelCategory && renderInputOutputTotalColumn('Output', MissingOnBackEndSegmentSortBy.OutputCount)}
      </Table>
      {/* TODO: Remove this conditional once the backend implements sorting input / output counts */}
      {showPagination && (
        <Pagination loading={loading} rowCount={data?.model?.totalFilteredSegments ?? 0} renderingOutsideTable />
      )}
    </div>
  );

  function renderInputOutputColumn(type: 'Input' | 'Output', tooltipContent: string) {
    const isInputType = type === 'Input';
    return (
      <Column
        header={
          <HeaderCell
            header={`${isInputType ? resourceTexts.inputs : resourceTexts.outputs} ${resourceTexts.count}`}
            renderTooltip={() => <HtmlTooltip tooltipContent={tooltipContent} />}
          />
        }
        cell={({ rowIndex }) => {
          const rowItem = tableItems[rowIndex];
          const dataList = isInputType ? rowItem.inputData : rowItem.outputData;
          return (
            <SparklineChart
              batchFrequency={batchFrequency}
              className={styles.cellBody}
              data={getSortedListFromInputOutputCount(dataList)}
              dataAccessor={(item) => item.y}
              keyIndex={rowIndex}
              labelingProp={SPARKLINE_DATE_KEY}
              hoveredRow={hoveredRow}
              syncId={type}
            />
          );
        }}
        width={300}
      />
    );
  }

  function getSortedListFromInputOutputCount(dataObject: InputOutputMap): InputOutputObject[] {
    return Object.values(dataObject.items).sort((a, b) => a.date - b.date);
  }

  function renderInputOutputTotalColumn(type: 'Input' | 'Output', sortKey: MissingOnBackEndSegmentSortBy) {
    const isInputType = type === 'Input';
    const label = isInputType ? resourceTexts.inputs : resourceTexts.outputs;

    // TODO: Remove the conditional and allow the user to always sort it once the back-end implements it properly
    const header =
      totalSegments <= SEGMENT_DEFAULT_LIMIT ? (
        <HeaderCellSortSelect
          header={`${label} ${resourceTexts.countTotal}`}
          renderTooltip={() => <></>}
          sortDirection={sortDirectionFor(sortKey)}
          onSortDirectionChange={onSortDirectionChangeFor(sortKey)}
        />
      ) : (
        <HeaderCell
          header={`${label} ${resourceTexts.countTotal}`}
          renderTooltip={() => <HtmlTooltip tooltipContent={resourceTexts.sortingDisabled} />}
        />
      );

    return (
      <Column
        header={header}
        cell={({ rowIndex }) => {
          const rowItem = tableItems[rowIndex];
          const { total } = isInputType ? rowItem.inputData : rowItem.outputData;
          return (
            <NumberCountCell>
              {total || (
                <Typography
                  style={{
                    fontSize: 12,
                    lineHeight: 1.5,
                    paddingLeft: '4px',
                    color: Colors.brandSecondary500,
                    fontStyle: 'italic',
                    fontFamily: 'Inconsolata',
                  }}
                >
                  No data available
                </Typography>
              )}
            </NumberCountCell>
          );
        }}
        align="right"
        width={200}
      />
    );
  }

  function getTableItems(): TableData[] {
    const items: TableData[] = segmentData.map(({ anomalyCounts, tags }, index) => ({
      inputData: inputData[index],
      outputData: outputData[index],
      tags: Array.isArray(tags) ? tags : [],
      timeseries: anomalyCounts?.timeseries ?? [],
    }));

    // TODO: Remove this custom sorting once the back-end implements it
    const isAscending = sortDirection === SortDirection.Asc;
    if (sortBy === MissingOnBackEndSegmentSortBy.InputCount) {
      items.sort((a, b) => {
        if (isAscending) return a.inputData.total - b.inputData.total;
        return b.inputData.total - a.inputData.total;
      });
    } else if (sortBy === MissingOnBackEndSegmentSortBy.OutputCount) {
      items.sort((a, b) => {
        if (isAscending) return a.outputData.total - b.outputData.total;
        return b.outputData.total - a.outputData.total;
      });
    }

    return items;
  }

  function sortDirectionFor(sortByKey: TempSegmentSortBy) {
    return sortBy === sortByKey ? sortDirection : undefined;
  }

  function onSortDirectionChangeFor(newSortBy: TempSegmentSortBy) {
    return (newSortDirection: SortDirectionType) => {
      onSortDirectionChange(newSortDirection, newSortBy);
    };
  }
}

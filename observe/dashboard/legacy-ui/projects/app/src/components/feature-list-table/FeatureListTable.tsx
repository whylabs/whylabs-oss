import { createStyles } from '@mantine/core';
import { Column, Table } from 'fixed-data-table-2';
import { useState } from 'react';
import {
  WhyLabsAutoSizer,
  Colors,
  Spacings,
  AlertCell,
  HeaderCell,
  HtmlTooltip,
  NoDataMessage,
  TableLoading,
  TextCell,
} from '@whylabs/observatory-lib';
import { SparklineChart } from 'components/visualizations/sparkline-chart/SparklineChart';
import { ExpandedData } from 'utils/expandTableData';
import { DriftSparklineChart } from 'components/visualizations/sparkline-chart/DriftSparklineChart';
import useTypographyStyles from 'styles/Typography';
import { TimePeriod } from 'generated/graphql';
import { InputsTableTexts } from 'pages/model-page/components/InputsTable/InputsTableTexts';
import { useResourceText } from 'pages/model-page/hooks/useResourceText';
import { WhyLabsTableKit, WhyLabsText } from 'components/design-system';
import { getParam } from 'pages/page-types/usePageType';
import { FilterKeys } from 'hooks/useFilterQueryString';

const {
  Footer: { Pagination },
} = WhyLabsTableKit;

export interface FeatureListTableProps<T, NullRatioData, TotalCountData, UniqueData, TypeCountData, DriftData> {
  readonly loading: boolean;
  readonly error: boolean;
  readonly data: NonNullable<T>[];
  readonly totalItems: number;
  readonly isOutput: boolean;
  readonly batchFrequency?: TimePeriod;
  name(item: NonNullable<T>): string;
  nameLink(item: NonNullable<T>): string | undefined;

  getInfDataType(item: NonNullable<T>): string | undefined;
  isDiscrete(item: NonNullable<T>): boolean | undefined;

  nullRatioData(item: NonNullable<T>): [NullRatioData[], (mv: NullRatioData) => number];
  totalCountData(item: NonNullable<T>): [TotalCountData[], (mv: TotalCountData) => number];
  uniqueData(item: NonNullable<T>): [UniqueData[], (mv: UniqueData) => number];
  typeCountData(item: NonNullable<T>): [TypeCountData[], (mv: TypeCountData) => number];
  driftData(item: NonNullable<T>): [DriftData[], (mv: DriftData) => number];
  // Anomalies
  totalCountAnomalies(item: NonNullable<T>): number;
  hasDriftAnomalies(item: NonNullable<T>): boolean;
  hasUniqueDataAnomalies(item: NonNullable<T>): boolean;
  hasTypeCountsAnomalies(item: NonNullable<T>): boolean;
  hasNullRatioAnomalies(item: NonNullable<T>): boolean;

  labelingPropName?: string | undefined;
  distributionLabelingPropName?: string | undefined;
}

const useStyles = createStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
    '& .fixedDataTableLayout_rowsContainer': {
      backgroundColor: Colors.brandSecondary100,
    },
  },
  nameColContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
  },
  nameCol: {
    height: '100%',
    '& .public_fixedDataTableCell_cellContent': {
      padding: 0,
    },
    '& p': {
      fontSize: 12,
    },
  },
  autoWrapper: {
    flexGrow: 1,
  },
  sparkline: {
    padding: 10,
    display: 'flex',
    alignItems: 'center',
    height: '100%',
  },
});

export function FeatureListTable<
  T,
  NullRatioData extends Record<string, unknown>,
  TotalCountData extends Record<string, unknown>,
  UniqueData extends Record<string, unknown>,
  TypeCountData extends Record<string, unknown>,
  DriftData extends ExpandedData,
>(props: FeatureListTableProps<T, NullRatioData, TotalCountData, UniqueData, TypeCountData, DriftData>): JSX.Element {
  const {
    batchFrequency,
    loading,
    error,
    data,
    isOutput = false,
    name,
    totalItems,
    nullRatioData: missingValue,
    nameLink,
    isDiscrete,
    hasNullRatioAnomalies,
    hasUniqueDataAnomalies,
    totalCountAnomalies,
    hasTypeCountsAnomalies,
    getInfDataType,
    totalCountData,
    uniqueData,
    typeCountData,
    driftData,
    hasDriftAnomalies,
    labelingPropName,
    distributionLabelingPropName,
  } = props;
  const { classes: styles, cx } = useStyles();
  const { classes: typography } = useTypographyStyles();
  const [hoveredRow, setHoveredRow] = useState(-1);
  const { resourceTexts } = useResourceText(InputsTableTexts);
  const searchTerm = getParam(FilterKeys.searchString);
  const nameHeaderTitle = isOutput ? resourceTexts.outputTitle : resourceTexts.featureTitle;
  const tooltipText = isOutput ? resourceTexts.outputNameTooltip : resourceTexts.featureNameTooltip;

  if (loading) {
    return <TableLoading />;
  }

  if (error) {
    console.error('Error looking up alert data', error);
    return (
      <NoDataMessage>
        <WhyLabsText inherit>{resourceTexts.errorLoadingData}</WhyLabsText>
      </NoDataMessage>
    );
  }

  if (data.length === 0) {
    return (
      <NoDataMessage>
        <WhyLabsText inherit>{resourceTexts.noDataFound}</WhyLabsText>
      </NoDataMessage>
    );
  }

  return (
    <div className={styles.root}>
      <div className={styles.autoWrapper}>
        <WhyLabsAutoSizer>
          {({ height, width }) => (
            <div>
              <Table
                rowHeight={40}
                headerHeight={40}
                rowsCount={data.length}
                width={width}
                height={height}
                onRowMouseEnter={(_: React.SyntheticEvent<Table, Event>, rowIndex: number) => {
                  setHoveredRow(rowIndex);
                }}
              >
                <Column
                  fixed
                  header={
                    <HeaderCell
                      header={nameHeaderTitle}
                      renderTooltip={() => <HtmlTooltip topOffset="-10px" tooltipContent={tooltipText} />}
                      isFirstColumn
                    />
                  }
                  cell={({ rowIndex, width: cellWidth }) => {
                    const link = nameLink(data[rowIndex]);
                    const totalAlerts = totalCountAnomalies(data[rowIndex]);
                    return (
                      <AlertCell
                        typographyClassName={typography.monoFont}
                        alertCount={totalAlerts}
                        name={name(data[rowIndex])}
                        width={cellWidth}
                        to={link}
                        searchTerm={searchTerm ?? ''}
                      />
                    );
                  }}
                  width={Spacings.leftColumnWidth}
                />

                <Column
                  header={
                    <HeaderCell
                      header={resourceTexts.infDataTypeHeader}
                      renderTooltip={() => (
                        <HtmlTooltip topOffset="-10px" tooltipContent={resourceTexts.infDataTypeTooltip} />
                      )}
                    />
                  }
                  cell={({ rowIndex }) => (
                    <TextCell typographyClassName={typography.monoFont} disableCaps>
                      {getInfDataType(data[rowIndex])}
                    </TextCell>
                  )}
                  width={184}
                  flexGrow={1}
                />

                <Column
                  header={
                    <HeaderCell
                      header={resourceTexts.totalCountHeader}
                      renderTooltip={() => (
                        <HtmlTooltip topOffset="-10px" tooltipContent={resourceTexts.totalCountTooltip} />
                      )}
                    />
                  }
                  cell={({ rowIndex }) => {
                    const [d, accessor] = totalCountData(data[rowIndex]);
                    return (
                      <SparklineChart
                        isAlert={false}
                        className={cx(styles.sparkline, typography.monoFont)}
                        data={d}
                        dataAccessor={accessor}
                        batchFrequency={batchFrequency}
                        labelingProp={labelingPropName}
                        hoveredRow={hoveredRow}
                        keyIndex={rowIndex}
                        syncId={resourceTexts.totalCountHeader}
                      />
                    );
                  }}
                  width={183}
                />
                <Column
                  header={
                    <HeaderCell
                      header={resourceTexts.nullFractionHeader}
                      renderTooltip={() => (
                        <HtmlTooltip topOffset="-10px" tooltipContent={resourceTexts.nullFractionTooltip} />
                      )}
                    />
                  }
                  cell={({ rowIndex }) => {
                    const [d, accessor] = missingValue(data[rowIndex]);
                    return (
                      <SparklineChart
                        isAlert={hasNullRatioAnomalies(data[rowIndex])}
                        className={cx(styles.sparkline, typography.monoFont)}
                        data={d}
                        dataAccessor={accessor}
                        tooltipDecimals={2}
                        labelingProp={labelingPropName}
                        batchFrequency={batchFrequency}
                        hoveredRow={hoveredRow}
                        keyIndex={rowIndex}
                        syncId={resourceTexts.nullFractionHeader}
                      />
                    );
                  }}
                  width={183}
                />
                <Column
                  header={
                    <HeaderCell
                      header={resourceTexts.driftDistanceHeader}
                      renderTooltip={() => (
                        <HtmlTooltip topOffset="-10px" tooltipContent={resourceTexts.driftDistanceTooltip} />
                      )}
                    />
                  }
                  cell={({ rowIndex }) => {
                    const [d, accessor] = driftData(data[rowIndex]);
                    return (
                      <DriftSparklineChart
                        isAlert={hasDriftAnomalies(data[rowIndex])}
                        className={cx(styles.sparkline, typography.monoFont)}
                        data={d}
                        dataAccessor={accessor}
                        tooltipDecimals={2}
                        labelingProp={distributionLabelingPropName}
                        batchFrequency={batchFrequency}
                        keyIndex={rowIndex}
                        hoveredRow={hoveredRow}
                        syncId={resourceTexts.driftDistanceHeader}
                      />
                    );
                  }}
                  width={183}
                />

                <Column
                  header={
                    <HeaderCell
                      header={resourceTexts.estUniqueValuesHeader}
                      renderTooltip={() => (
                        <HtmlTooltip topOffset="-10px" tooltipContent={resourceTexts.estUniqueValuesTooltip} />
                      )}
                    />
                  }
                  cell={({ rowIndex }) => {
                    const [d, accessor] = uniqueData(data[rowIndex]);
                    return (
                      <SparklineChart
                        isAlert={hasUniqueDataAnomalies(data[rowIndex])}
                        className={cx(styles.sparkline, typography.monoFont)}
                        data={d}
                        dataAccessor={accessor}
                        tooltipDecimals={2}
                        batchFrequency={batchFrequency}
                        labelingProp={labelingPropName}
                        hoveredRow={hoveredRow}
                        keyIndex={rowIndex}
                        syncId={resourceTexts.estUniqueValuesHeader}
                      />
                    );
                  }}
                  width={183}
                />
                <Column
                  header={
                    <HeaderCell
                      header={resourceTexts.infFeatureTypeHeader}
                      renderTooltip={() => (
                        <HtmlTooltip topOffset="-10px" tooltipContent={resourceTexts.infFeatureTypeTooltip} />
                      )}
                    />
                  }
                  cell={({ rowIndex }) => {
                    const discrete = isDiscrete(data[rowIndex]);
                    if (discrete === undefined) {
                      return (
                        <TextCell className={typography.allContentMonospaceFont}>{resourceTexts.unknown}</TextCell>
                      );
                    }

                    return (
                      <TextCell className={typography.allContentMonospaceFont}>
                        {isDiscrete(data[rowIndex]) ? resourceTexts.discrete : resourceTexts.nonDiscrete}
                      </TextCell>
                    );
                  }}
                  width={200}
                  flexGrow={1}
                />

                <Column
                  header={
                    <HeaderCell
                      header={resourceTexts.dataTypeCountHeader}
                      renderTooltip={() => (
                        <HtmlTooltip topOffset="-10px" tooltipContent={resourceTexts.dataTypeCountTooltip} />
                      )}
                    />
                  }
                  cell={({ rowIndex }) => {
                    const [d, accessor] = typeCountData(data[rowIndex]);
                    return (
                      <SparklineChart
                        isAlert={hasTypeCountsAnomalies(data[rowIndex])}
                        className={cx(styles.sparkline, typography.monoFont)}
                        data={d}
                        dataAccessor={accessor}
                        batchFrequency={batchFrequency}
                        labelingProp={labelingPropName}
                        hoveredRow={hoveredRow}
                        keyIndex={rowIndex}
                        syncId={resourceTexts.dataTypeCountHeader}
                      />
                    );
                  }}
                  width={183}
                />
              </Table>
            </div>
          )}
        </WhyLabsAutoSizer>
      </div>

      <Pagination loading={loading} rowCount={totalItems} renderingOutsideTable />
    </div>
  );
}

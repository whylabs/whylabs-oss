import { Column, Table } from 'fixed-data-table-2';
import { useState } from 'react';
import { AlertCell, HeaderCell, HtmlTooltip, Spacings, TextCell } from '@whylabs/observatory-lib';
import { AlertCategoryCounts, FeatureSortBy, TimePeriod } from 'generated/graphql';
import { UnitType } from 'hooks/lagacyDateRangeUtils';
import { getDateBuckets } from 'utils/dateUtils';
import { SortDirectionType } from 'hooks/useSort/types';
import { SparklineChart } from 'components/visualizations/sparkline-chart/SparklineChart';
import { ExpandedData } from 'utils/expandTableData';
import useTypographyStyles from 'styles/Typography';
import { DriftSparklineChart } from 'components/visualizations/sparkline-chart/DriftSparklineChart';
import SparkbarV3Cell from 'components/controls/table/cells/SparkbarV3Cell';
import { NumberCountCell } from 'components/controls/table/cells/NumberCountCell';
import { friendlyFormat } from 'utils/numberUtils';
import { useResourceText } from 'pages/model-page/hooks/useResourceText';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';
import { getParam } from 'pages/page-types/usePageType';
import { FilterKeys } from 'hooks/useFilterQueryString';
import { createStyles } from '@mantine/core';
import HeaderCellSortSelect from '../../HeaderCellSortSelect';
import { InputsTableTexts } from './InputsTableTexts';

const FILE_TEXTS = {
  DATA: {
    ...InputsTableTexts.DATA,
    anomaliesInRangeHeaderTooltip:
      'A visualization and count of the total anomalies occurring in the applied time range',
    weightHeader: '',
    weightHeaderTooltip: '',
  },
  MODEL: {
    ...InputsTableTexts.MODEL,
    anomaliesInRangeHeaderTooltip:
      'A visualization and count of the total anomalies occurring in the applied time range',
    weightHeader: 'Weight',
    weightHeaderTooltip: 'Feature weight',
  },
  LLM: {
    ...InputsTableTexts.LLM,
    anomaliesInRangeHeaderTooltip:
      'A visualization and count of the total anomalies occurring in the applied time range',
    weightHeader: 'Weight',
    weightHeaderTooltip: 'Metric weight',
  },
};

interface InputsTableProps<T, NullRatioData, TotalCountData, UniqueData, TypeCountData, DriftData>
  extends InputsTableBaseProps<T, NullRatioData, TotalCountData, UniqueData, TypeCountData, DriftData> {
  readonly data: NonNullable<T>[];
  width: number;
  height: number;
  readonly batchFrequency: TimePeriod | undefined;
  readonly sortBy: FeatureSortBy | undefined;
  hasWeights?: boolean;
}

export interface InputsTableBaseProps<T, NullRatioData, TotalCountData, UniqueData, TypeCountData, DriftData> {
  readonly nameHeaderTitle: string;
  readonly labelingPropName?: string;
  readonly distributionLabelingPropName?: string;

  name(item: NonNullable<T>): string;
  nameLink(item: NonNullable<T>): string | undefined;

  getInfDataType(item: NonNullable<T>): string | undefined;
  isDiscrete(item: NonNullable<T>): boolean | undefined;
  getWeight?(item: NonNullable<T>): number | null | undefined;

  nullRatioData(item: NonNullable<T>): [NullRatioData[], (mv: NullRatioData) => number];
  totalCountData(item: NonNullable<T>): [TotalCountData[], (mv: TotalCountData) => number];
  uniqueData(item: NonNullable<T>): [UniqueData[], (mv: UniqueData) => number];
  typeCountData(item: NonNullable<T>): [TypeCountData[], (mv: TypeCountData) => number];
  driftData(item: NonNullable<T>): [DriftData[], (mv: DriftData) => number];
  onSortDirectionChange: (sortDirection: SortDirectionType, sortBy: FeatureSortBy) => void;
  sortDirection: SortDirectionType;
  // Anomalies
  anomaliesData: (AlertCategoryCounts | null)[] | null;
  hasUniqueDataAnomalies(item: NonNullable<T>): boolean;
  hasTypeCountsAnomalies(item: NonNullable<T>): boolean;
  hasDriftAnomalies(item: NonNullable<T>): boolean;
  hasNullRatioAnomalies(item: NonNullable<T>): boolean;
  totalCountAnomalies(item: NonNullable<T>): number;
}

const useStyles = createStyles({
  sparkline: {
    padding: 10,
    display: 'flex',
    alignItems: 'center',
    height: '100%',
  },
});

export const INPUTS_TABLE_TEST_ID = 'inputs-table-test-id';

export function InputsTable<
  T,
  NullRatioData extends Record<string, unknown>,
  TotalCountData extends Record<string, unknown>,
  UniqueData extends Record<string, unknown>,
  TypeCountData extends Record<string, unknown>,
  DriftData extends ExpandedData,
>(props: InputsTableProps<T, NullRatioData, TotalCountData, UniqueData, TypeCountData, DriftData>): JSX.Element {
  const {
    data,
    batchFrequency,
    anomaliesData,
    nameHeaderTitle,
    name,
    nullRatioData: missingValue,
    nameLink,
    isDiscrete,
    hasNullRatioAnomalies,
    hasDriftAnomalies,
    hasTypeCountsAnomalies,
    hasUniqueDataAnomalies,
    getInfDataType,
    driftData,
    totalCountData,
    uniqueData,
    typeCountData,
    totalCountAnomalies,
    labelingPropName,
    distributionLabelingPropName,
    onSortDirectionChange,
    sortDirection,
    width,
    height,
    sortBy,
    hasWeights,
    getWeight,
  } = props;
  const { classes: styles } = useStyles();
  const { dateRange } = useSuperGlobalDateRange();
  const isMonthly = batchFrequency === TimePeriod.P1M;
  const searchTerm = getParam(FilterKeys.searchString);
  const getUnitType = (freq: TimePeriod | undefined): UnitType => {
    switch (freq) {
      case TimePeriod.P1M:
        return 'M';
      case TimePeriod.P1W:
        return 'W';
      case TimePeriod.Pt1H:
        return 'H';
      default:
        return 'D';
    }
  };

  const dateBuckets = getDateBuckets(dateRange, 30, getUnitType(batchFrequency), 36, isMonthly && false);
  const [hoveredRow, setHoveredRow] = useState(-1);
  const { resourceTexts, isModelCategory } = useResourceText(FILE_TEXTS);
  const { classes: typography } = useTypographyStyles();

  return (
    <div data-testid={INPUTS_TABLE_TEST_ID}>
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
            <HeaderCellSortSelect
              header={nameHeaderTitle}
              renderTooltip={() => <HtmlTooltip topOffset="-10px" tooltipContent={resourceTexts.featureNameTooltip} />}
              sortDirection={sortBy === FeatureSortBy.Name ? sortDirection : undefined}
              onSortDirectionChange={(newSortDir) => onSortDirectionChange(newSortDir, FeatureSortBy.Name)}
              isFirstColumn
            />
          }
          cell={({ rowIndex, width: cellWidth }) => {
            const link = nameLink(data[rowIndex]);
            return (
              <AlertCell
                typographyClassName={typography.monoFont}
                alertCount={totalCountAnomalies(data[rowIndex])}
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
          columnKey="alertsByTime"
          header={
            <HeaderCellSortSelect
              header={resourceTexts.anomaliesInRange}
              renderTooltip={() => (
                <HtmlTooltip topOffset="-10px" tooltipContent={resourceTexts.anomaliesInRangeHeaderTooltip} />
              )}
              sortDirection={sortBy === FeatureSortBy.AlertCount ? sortDirection : undefined}
              onSortDirectionChange={(newSortDir) => onSortDirectionChange(newSortDir, FeatureSortBy.AlertCount)}
            />
          }
          cell={({ rowIndex, height: sparkHeight, width: sparkWidth }) => {
            return (
              <SparkbarV3Cell
                rowIndex={rowIndex}
                hoveredRow={hoveredRow}
                width={sparkWidth}
                height={sparkHeight}
                syncId={resourceTexts.anomaliesInRange}
                batchFrequency={batchFrequency}
                alertV3Data={anomaliesData?.[rowIndex] ?? null}
                dateBuckets={dateBuckets}
                columnKey="alertsByTime"
              />
            );
          }}
          width={200}
        />

        <Column
          header={
            <HeaderCell
              header={resourceTexts.infDataTypeHeader}
              renderTooltip={() => <HtmlTooltip topOffset="-10px" tooltipContent={resourceTexts.infDataTypeTooltip} />}
            />
          }
          cell={({ rowIndex }) => (
            <TextCell typographyClassName={typography.monoFont} disableCaps>
              {getInfDataType(data[rowIndex])}
            </TextCell>
          )}
          width={154}
          flexGrow={1}
        />

        <Column
          header={
            <HeaderCell
              header={resourceTexts.totalCountHeader}
              renderTooltip={() => <HtmlTooltip topOffset="-10px" tooltipContent={resourceTexts.totalCountTooltip} />}
            />
          }
          cell={({ rowIndex }) => {
            const [d, accessor] = totalCountData(data[rowIndex]);

            return (
              <SparklineChart
                isAlert={false}
                className={styles.sparkline}
                data={d}
                labelingProp={labelingPropName}
                batchFrequency={batchFrequency}
                keyIndex={rowIndex}
                syncId={resourceTexts.totalCountHeader}
                dataAccessor={accessor}
                hoveredRow={hoveredRow}
              />
            );
          }}
          width={183}
        />
        <Column
          header={
            <HeaderCell
              header={resourceTexts.nullFractionHeader}
              renderTooltip={() => <HtmlTooltip topOffset="-10px" tooltipContent={resourceTexts.nullFractionTooltip} />}
            />
          }
          cell={({ rowIndex }) => {
            const [d, accessor] = missingValue(data[rowIndex]);
            return (
              <SparklineChart
                isAlert={hasNullRatioAnomalies(data[rowIndex])}
                className={styles.sparkline}
                data={d}
                dataAccessor={accessor}
                batchFrequency={batchFrequency}
                tooltipDecimals={2}
                labelingProp={labelingPropName}
                keyIndex={rowIndex}
                hoveredRow={hoveredRow}
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
                className={styles.sparkline}
                data={d}
                dataAccessor={accessor}
                tooltipDecimals={2}
                batchFrequency={batchFrequency}
                labelingProp={distributionLabelingPropName}
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
                className={styles.sparkline}
                data={d}
                dataAccessor={accessor}
                tooltipDecimals={2}
                labelingProp={labelingPropName}
                batchFrequency={batchFrequency}
                keyIndex={rowIndex}
                hoveredRow={hoveredRow}
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
              return <TextCell>Unknown</TextCell>;
            }

            return (
              <TextCell typographyClassName={typography.monoFont}>
                {isDiscrete(data[rowIndex]) ? resourceTexts.discrete : resourceTexts.nonDiscrete}
              </TextCell>
            );
          }}
          width={200}
          flexGrow={1}
        />
        {hasWeights && isModelCategory && (
          <Column
            align="right"
            header={
              <HeaderCellSortSelect
                header={resourceTexts.weightHeader}
                renderTooltip={() => (
                  <HtmlTooltip topOffset="-10px" tooltipContent={resourceTexts.weightHeaderTooltip} />
                )}
                sortDirection={sortBy === FeatureSortBy.AbsoluteWeight ? sortDirection : undefined}
                onSortDirectionChange={(newSortDir) => onSortDirectionChange(newSortDir, FeatureSortBy.AbsoluteWeight)}
              />
            }
            cell={({ rowIndex }) => {
              const value = getWeight?.(data[rowIndex]);
              return <NumberCountCell>{value ? friendlyFormat(value, 6) : '-'}</NumberCountCell>;
            }}
            width={150}
            flexGrow={1}
          />
        )}
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
                className={styles.sparkline}
                data={d}
                dataAccessor={accessor}
                labelingProp={labelingPropName}
                batchFrequency={batchFrequency}
                keyIndex={rowIndex}
                hoveredRow={hoveredRow}
                syncId={resourceTexts.dataTypeCountHeader}
              />
            );
          }}
          width={183}
        />
      </Table>
    </div>
  );
}

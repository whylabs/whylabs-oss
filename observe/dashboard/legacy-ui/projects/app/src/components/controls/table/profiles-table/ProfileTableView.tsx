import { HtmlTooltip, HeaderCell } from '@whylabs/observatory-lib';
import { useElementSize } from '@mantine/hooks';
import { Column, Table } from 'fixed-data-table-2';
import { useRecoilState } from 'recoil';
import { tableSelectedRowAtom } from 'atoms/profilesTableAtom';
import { AnalysisMetric, SortDirection } from 'generated/graphql';
import { useResourceText } from 'pages/model-page/hooks/useResourceText';
import HeaderCellSortSelect from 'pages/model-page/HeaderCellSortSelect';
import { InputsTableTexts } from 'pages/model-page/components/InputsTable/InputsTableTexts';
import { TableColumn, TableFeatureDataType } from './types';
import useProfilesTableCSS from './useProfilesTableCSS';
import FirstProfilesTableCell from './FirstProfilesTableCell';
import ProfilesTableCell from './ProfilesTableCell';

const COMMON_TEXTS = {
  frequentItemsHeader: 'Frequent items',
  dataTypeHeader: 'Data type',
  dataTypeCountHeader: 'Data type count',
  estMeanHeader: 'Est. mean',
  estStdDevHeader: 'Est. std dev',
  minHeader: 'Min',
  estMedianHeader: 'Est. median',
  maxHeader: 'Max',
  frequentItemsTooltipText: 'The most frequently found items in the data set over the selected time range.',
  estUniqueValuesTooltipText: 'The approximate number of unique values for the selected profile',
  dataTypeCountTooltipText: 'Number of records of the inferred data type for the selected profile',
  featureNameHeader: 'Column name',
  maxTooltipText: 'The maximum value for the column, as profiled by whylogs',
  minTooltipText: 'The minimum value for the column, as profiled by whylogs',
  nullFractionTooltipText: "The column's null fraction for the selected profile",
  totalCountTooltipText: 'The number of records for the column in the selected profile',
};

const COMPONENT_TEXTS = {
  DATA: {
    ...COMMON_TEXTS,
    ...InputsTableTexts.DATA,
    estMeanTooltipText: 'The estimated mean for the column, as approximated by whylogs',
    estMedianTooltipText: 'The estimated median for the column, as approximated by whylogs',
    estStdDevTooltipText: 'The estimated standard deviation for the column, as approximated by whylogs',
    featureNameHeader: 'Column name',
    featureNameTooltipText: 'The list of columns that are present in the selected profile(s).',
  },
  MODEL: {
    ...COMMON_TEXTS,
    ...InputsTableTexts.MODEL,
    estMeanTooltipText: 'The estimated mean for the feature, as approximated by whylogs',
    estMedianTooltipText: 'The estimated median for the feature, as approximated by whylogs',
    estStdDevTooltipText: 'The estimated standard deviation for the feature, as approximated by whylogs',
    featureNameTooltipText: 'The list of features and outputs that are present in the selected profile(s).',
  },
  LLM: {
    ...COMMON_TEXTS,
    ...InputsTableTexts.LLM,
    featureNameHeader: 'Metric name',
    estMeanTooltipText: 'The estimated mean for the metric, as approximated by whylogs',
    estMedianTooltipText: 'The estimated median for the metric, as approximated by whylogs',
    estStdDevTooltipText: 'The estimated standard deviation for the metric, as approximated by whylogs',
    featureNameTooltipText: 'The list of metrics that are present in the selected profile(s).',
    maxTooltipText: 'The maximum value for the metric, as profiled by whylogs',
    minTooltipText: 'The minimum value for the metric, as profiled by whylogs',
    nullFractionTooltipText: "The metric's null fraction for the selected profile",
    totalCountTooltipText: 'The number of records for the metric in the selected profile',
  },
};

interface ProfileTableViewProps {
  features: { [key: string]: TableFeatureDataType[] };
  numOfProfiles: number;
  sortedKeys: string[];
  onRowClick: (featureData: TableFeatureDataType[]) => void;
  sortDirection: SortDirection;
  toggleSort: () => void;
  showUnifiedBins: boolean;
  unifiedBinsLoading: boolean;
}

export default function ProfileTableView({
  features,
  numOfProfiles,
  sortedKeys,
  onRowClick,
  sortDirection,
  toggleSort,
  showUnifiedBins,
  unifiedBinsLoading,
}: ProfileTableViewProps): JSX.Element {
  const { resourceTexts } = useResourceText(COMPONENT_TEXTS);
  const [tableSelectedRow, setTableSelectedRow] = useRecoilState<number>(tableSelectedRowAtom);
  const { classes: styles, cx } = useProfilesTableCSS();
  const { ref, width, height } = useElementSize<HTMLDivElement>();

  const TABLE_COLUMNS: TableColumn[] = [
    {
      headerName: resourceTexts.featureNameHeader,
      accessor: 'feature-name',
      colWidth: 377,
      colValueClass: '',
      colAlign: 'left',
      toolTipText: resourceTexts.featureNameTooltipText,
    },
    {
      headerName: resourceTexts.totalCountHeader,
      accessor: 'total-count',
      anomalyAccessor: [AnalysisMetric.ProfileCount, AnalysisMetric.Count],
      colWidth: 120,
      colValueClass: '',
      colAlign: 'right',
      toolTipText: resourceTexts.totalCountTooltipText,
    },
    {
      headerName: resourceTexts.estMeanHeader,
      accessor: 'mean',
      anomalyAccessor: [AnalysisMetric.Mean],
      colWidth: 100,
      colValueClass: '',
      colAlign: 'right',
      toolTipText: resourceTexts.estMeanTooltipText,
    },
    {
      headerName: resourceTexts.estMedianHeader,
      accessor: 'median',
      anomalyAccessor: [AnalysisMetric.Median],
      colWidth: 100,
      colValueClass: '',
      colAlign: 'right',
      toolTipText: resourceTexts.estMedianTooltipText,
    },
    {
      headerName: resourceTexts.minHeader,
      accessor: 'min',
      anomalyAccessor: [AnalysisMetric.Min],
      colWidth: 100,
      colValueClass: '',
      colAlign: 'right',
      toolTipText: resourceTexts.minTooltipText,
    },
    {
      headerName: resourceTexts.maxHeader,
      accessor: 'max',
      anomalyAccessor: [AnalysisMetric.Max],
      colWidth: 100,
      colValueClass: '',
      colAlign: 'right',
      toolTipText: resourceTexts.maxTooltipText,
    },
    {
      headerName: resourceTexts.estStdDevHeader,
      accessor: 'standard-deviation',
      anomalyAccessor: [AnalysisMetric.StdDev],
      colWidth: 100,
      colValueClass: '',
      colAlign: 'right',
      toolTipText: resourceTexts.estStdDevTooltipText,
    },
    {
      headerName: resourceTexts.nullFractionHeader,
      accessor: 'null-fraction',
      anomalyAccessor: [AnalysisMetric.CountNullRatio],
      colWidth: 120,
      colValueClass: '',
      colAlign: 'right',
      toolTipText: resourceTexts.nullFractionTooltipText,
    },
    {
      headerName: resourceTexts.estUniqueValuesHeader,
      accessor: 'est-unique-val',
      anomalyAccessor: [AnalysisMetric.UniqueEstRatio, AnalysisMetric.UniqueEst],
      colWidth: 150,
      colValueClass: '',
      colAlign: 'right',
      toolTipText: resourceTexts.estUniqueValuesTooltipText,
    },
    {
      headerName: resourceTexts.infFeatureTypeHeader,
      accessor: 'inferred-discretion',
      colWidth: 130,
      colValueClass: '',
      colAlign: 'left',
      toolTipText: resourceTexts.infFeatureTypeTooltip,
    },
    {
      headerName: resourceTexts.dataTypeHeader,
      accessor: 'data-type',
      anomalyAccessor: [AnalysisMetric.InferredDataType],
      colWidth: 120,
      colValueClass: styles.columnDataType,
      colAlign: 'left',
      toolTipText: resourceTexts.infDataTypeTooltip,
    },
    {
      headerName: resourceTexts.dataTypeCountHeader,
      accessor: 'data-type-count',
      colWidth: 150,
      colValueClass: '',
      colAlign: 'right',
      toolTipText: resourceTexts.dataTypeCountTooltipText,
    },
  ];
  const rowPerProfileHeight = 35;
  const featureNameHeight = 33;
  const singleCellPadding = 4;
  const paddingHeight = 2 * singleCellPadding;
  const rowHeight = paddingHeight + featureNameHeight + rowPerProfileHeight * numOfProfiles;
  const chartWidth = TABLE_COLUMNS[0].colWidth * 0.75;

  function onClickHandler(isFirst: boolean, featureData: TableFeatureDataType[], rowIndex: number) {
    if (isFirst) {
      setTableSelectedRow(rowIndex);
      onRowClick(featureData);
    }
  }

  return (
    <div className={styles.autoWrapper} ref={ref}>
      <Table
        className={styles.fixedTable}
        rowHeight={rowHeight}
        headerHeight={40}
        rowsCount={sortedKeys.length}
        width={width}
        height={height || 600}
        rowClassNameGetter={(rowIndex) => (rowIndex === tableSelectedRow ? 'selected_row' : '')}
      >
        {TABLE_COLUMNS.map(
          ({ headerName, accessor, colWidth, colAlign, colValueClass, toolTipText, anomalyAccessor }, i) => {
            const isFirstCol = i === 0;

            return (
              <Column
                key={`${headerName}-key`}
                fixed={isFirstCol}
                width={colWidth}
                minWidth={40}
                align={colAlign}
                flexGrow={isFirstCol ? 0 : 1}
                header={(isFirstCol ? renderFirstColHeader : renderHeader)(headerName, toolTipText)}
                cell={({ rowIndex }) => {
                  const featureNameKey = sortedKeys[rowIndex];
                  const featureValuesForEachProfile = features[featureNameKey] || [];

                  return (
                    // eslint-disable-next-line
                    <div
                      className={cx(styles.singleCell, isFirstCol ? styles.firstSingleCell : '')}
                      onClick={() => onClickHandler(isFirstCol, featureValuesForEachProfile, rowIndex)}
                      role="button"
                    >
                      <div className={styles.singleCellContent}>
                        {isFirstCol ? (
                          <FirstProfilesTableCell
                            unifiedBinsLoading={unifiedBinsLoading}
                            showUnifiedBins={showUnifiedBins}
                            rowPerProfileHeight={rowPerProfileHeight}
                            featureNameKey={featureNameKey}
                            featureValuesForEachProfile={featureValuesForEachProfile}
                            onClickHandler={() => onClickHandler(isFirstCol, featureValuesForEachProfile, rowIndex)}
                            chartWidth={chartWidth}
                          />
                        ) : (
                          <ProfilesTableCell
                            featureValuesForEachProfile={featureValuesForEachProfile}
                            accessor={accessor}
                            anomalyAccessor={anomalyAccessor}
                            colValueClass={colValueClass}
                            rowPerProfileHeight={rowPerProfileHeight}
                          />
                        )}
                      </div>
                    </div>
                  );
                }}
              />
            );
          },
        )}
      </Table>
    </div>
  );

  function renderFirstColHeader(headerName: string, toolTipText: string | JSX.Element) {
    return (
      <HeaderCellSortSelect
        header={headerName}
        sortDirection={sortDirection}
        onSortDirectionChange={toggleSort}
        renderTooltip={renderHeaderTooltip(headerName, toolTipText)}
      />
    );
  }

  function renderHeader(headerName: string, toolTipText: string | JSX.Element) {
    return <HeaderCell header={headerName} renderTooltip={renderHeaderTooltip(headerName, toolTipText)} />;
  }

  function renderHeaderTooltip(headerName: string, toolTipText: string | JSX.Element) {
    return () => {
      if (headerName) {
        return <HtmlTooltip topOffset="-9px" tooltipContent={toolTipText || headerName} />;
      }
      return <></>;
    };
  }
}

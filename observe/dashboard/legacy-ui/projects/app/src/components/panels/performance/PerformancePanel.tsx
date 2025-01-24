import { Colors } from '@whylabs/observatory-lib';
import {
  AnalysisDataFragment,
  AnalysisMetric,
  GetModelPerformanceQueryResult,
  MetricSource,
  ModelPerformanceFragment,
  ModelType,
  SegmentPerformanceFragment,
  TimePeriod,
} from 'generated/graphql';
import { createStyles } from '@mantine/core';
import { ApolloError } from '@apollo/client';
import { timeLong } from 'utils/dateUtils';
import { useCallback, useMemo, useRef } from 'react';
import { asPercentage, friendlyFormat } from 'utils/numberUtils';
import { ScaleOrdinal } from 'd3-scale';
import { scaleOrdinal } from '@visx/scale';
import { useResetRecoilState } from 'recoil';
import { whyCardsAnalyzersAtom } from 'atoms/whyCardsAnalyzersAtom';
import { upperCaseFirstLetterOnly } from 'utils/stringUtils';
import { isNotNullish } from 'utils/nullUtils';
import { VariableHeightCard } from 'components/design-system/paper/VariableHeightCard';
import { HeatMapView } from 'components/visualizations/heat-map/HeatMapView';
import { VariableWidthCard } from 'components/design-system/paper/VariableWidthCard';
import { SquareCurveView } from 'components/visualizations/simple-curve/SquareCurveView';
import MultiMetricLongCard from './MultiMetricLongCard';
import { getConfusionWidth } from './performanceUtils';
import { useClassificationViewHelper } from './useClassificationViewHelper';

const SQUARES_HEIGHT = 452;
const useStyles = createStyles((theme) => ({
  tabContainer: {
    display: 'flex',
    flexDirection: 'column',
    paddingBottom: 16,
    overflow: 'auto',
  },
  longContainer: {
    marginRight: theme.spacing.md,
    marginLeft: theme.spacing.md,
  },
  squaresContainer: {
    marginRight: theme.spacing.md,
    marginLeft: theme.spacing.md,
  },
  updatedSquaresContainer: {
    marginRight: 0,
    marginLeft: 0,
    display: 'flex',
    flexDirection: 'row',
    height: SQUARES_HEIGHT,
    justifyContent: 'stretch',
    marginBottom: theme.spacing.md,
  },
  longGraphContainer: {
    display: 'flex',
    flexDirection: 'row',
    marginTop: 0,
    marginBottom: 0,
    minHeight: '100%',
  },
  longGraphMessage: {
    fontSize: 16,
    fontWeight: 400,
    color: Colors.brandSecondary700,
  },
  compareLegend: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
}));

export const ACCURACY_METRIC_NAME = 'whylogs.metrics.derived.accuracy';
export const RMSE_METRIC_NAME = 'whylogs.metrics.derived.root_mean_squared_error';
export const ACCURACY_NAME = 'accuracy';
export const RMSE_NAME = 'root_mean_squared_error';
export const F1_NAME = 'f1';
export const PRECISION_NAME = 'precision';
export const RECALL_NAME = 'recall';
export const FPR_NAME = 'fpr';
export const MACROAUC_NAME = 'macroAuc';

const SPECIAL_NAMES = [ACCURACY_NAME, F1_NAME, PRECISION_NAME, RECALL_NAME, FPR_NAME, MACROAUC_NAME];
const DERIVED_START = 'whylogs.metrics.derived.';
const FILTERED_START = 'whylogs.metrics.';
const ACCURACY_LABELS = ['Accuracy', 'compareAccuracy'];
const COUNTING_LABELS = ['Input', 'Output'];

/**
 * Determine how to filter anomalies based on the list of available metrics for the given dataset
 * @param modelPerfQueryResult
 */
export const getPerformanceAnomaliesFilterParams = (
  modelPerfQueryResult: GetModelPerformanceQueryResult,
): {
  metricsFilter: AnalysisMetric[];
  columnsFilter: string[];
} => {
  const specialMetricColumn = '__internal__.datasetMetrics';
  const datasetMetrics = modelPerfQueryResult.data?.model?.datasetMetrics ?? [];
  const metricsFilter: AnalysisMetric[] =
    datasetMetrics.map((d) => d.metadata?.queryDefinition?.metric)?.filter(isNotNullish) ?? [];
  const columnsFilter: string[] = (
    datasetMetrics.map((d) => d.metadata?.queryDefinition?.column)?.filter(isNotNullish) ?? []
  ).concat(specialMetricColumn);

  return { metricsFilter, columnsFilter };
};

function generateColorScale(labels: string[], colorRange: string[]): ScaleOrdinal<string, string> {
  return scaleOrdinal<string, string>({
    domain: labels,
    range: colorRange,
  });
}

const countingColorScale = generateColorScale(COUNTING_LABELS, Colors.comparisonColorArray);
const accuracyColorScale = generateColorScale(ACCURACY_LABELS, Colors.chartColorArray);

const asPercentageIfNeeded = (value: number | null, showAsPercentage: boolean): string => {
  if (value === undefined || value === null) {
    return '';
  }

  return showAsPercentage ? asPercentage(value, 4) : friendlyFormat(value, 4);
};

const hackSlice = (whyString: string): string => {
  let result = whyString;
  if (result.includes(DERIVED_START)) {
    result = result.slice(DERIVED_START.length);
  }
  return result;
};

function sortScoreMetricName(name: string): number {
  let score = 0;
  if (name.startsWith(DERIVED_START)) {
    score += 3;
  }
  if (name.startsWith(FILTERED_START)) {
    score += 2;
  }
  if (SPECIAL_NAMES.includes(name)) {
    score += 1;
  }
  return score;
}

interface ChartData {
  label: string;
  values: (number | null)[];
  color: string;
  datasetName?: string;
}

interface PerfDatum {
  timestamp: number;
  inputCount?: number;
  outputCount?: number;
  value?: number;
}

interface PerformancePanelProps {
  data?: ModelPerformanceFragment | SegmentPerformanceFragment | null; // data for a given dataset or segment
  error: ApolloError | undefined;
  loading: boolean;
  name: string | undefined;
  compareName?: string | undefined;
  modelType: ModelType | undefined;
  batchFrequency: TimePeriod | undefined;
  compareData?: ModelPerformanceFragment | SegmentPerformanceFragment | undefined | null;
  anomalies?: AnalysisDataFragment[] | undefined | null;
}

const PerformancePanel: React.FC<PerformancePanelProps> = ({
  data,
  error,
  loading,
  name,
  modelType,
  batchFrequency,
  compareData,
  compareName,
  anomalies,
}) => {
  const { classes: styles } = useStyles();
  const shouldShowClassification = modelType === ModelType.Classification || modelType === ModelType.Unknown;
  const shouldShowRegression = modelType === ModelType.Regression;

  const { lastBatchData, confusionData, precisionData, rocAucData, updateByKey, hasNextByKey, hasPreviousByKey } =
    useClassificationViewHelper({
      data,
    });

  const last = lastBatchData;
  const confusion = confusionData?.metrics.confusion;
  const multiclass = confusion ? confusion.labels.length > 2 : false;
  const hasConfusion = !!confusion;

  const names = (data?.datasetMetrics ?? []).map((d) => d.name);
  names.sort((a, b) => {
    const aScore = sortScoreMetricName(a);
    const bScore = sortScoreMetricName(b);
    return aScore - bScore;
  });

  // Note: 'name' is in the props, so to avoid the no-shadow lint, I use 'n' throughout
  const metricsMap = new Map(names.map((n) => [n, (data?.datasetMetrics ?? []).find((d) => d.name === n)]));

  function getCombinedTimestamps(datasets: Array<Array<{ timestamp: number }>>): number[] {
    const combinedTimestamps = new Set<number>();
    datasets.forEach((dataset) => {
      dataset.forEach((d) => combinedTimestamps.add(d.timestamp));
    });
    return Array.from(combinedTimestamps).sort();
  }
  const resetAnalyzersRecoilState = useResetRecoilState(whyCardsAnalyzersAtom);
  const firstLoad = useRef(true);
  if (firstLoad.current) {
    resetAnalyzersRecoilState();
    firstLoad.current = false;
  }

  const combineDatasets = useCallback(
    (
      labels: Array<string | undefined>,
      colors: Array<string>,
      datasets: Array<Array<{ timestamp: number }>>,
      accessors: Array<(d: PerfDatum) => number | undefined>,
      datasetNames?: Array<string>,
    ): ChartData[] => {
      const timestamps = getCombinedTimestamps(datasets);

      const timeseriesData: ChartData[] = [];
      labels.forEach((label, datasetIndex) => {
        if (label === undefined) {
          return;
        }

        let i = 0;
        const values = timestamps.map((t) => {
          const d = datasets[datasetIndex];
          while (d[i] && d[i].timestamp < t) {
            i += 1;
          }
          if (d[i] && d[i].timestamp === t) {
            return accessors[datasetIndex](d[i]) ?? null;
          }
          return null;
        });

        const datasetName = datasetNames && datasetNames[datasetIndex] ? datasetNames[datasetIndex] : undefined;

        timeseriesData.push({
          label,
          color: colors[datasetIndex],
          values,
          datasetName,
        });
      });
      return timeseriesData;
    },
    [],
  );

  const [inputOutputData, inputOutputTimestamps, accuracyData, accuracyTimestamps] = useMemo(() => {
    let ioData: ChartData[] = [];
    let ioTimestamps: number[] = [];
    let accData: ChartData[] = [];
    let accTimestamps: number[] = [];

    if (data?.batches.length) {
      const labels = !compareData?.batches.length
        ? ['Input', 'Output']
        : [`${name} input`, `${compareName} input`, `${name} output`, `${compareName} output`];
      const datasetNames =
        !!compareData?.batches.length && name && compareName ? [name, compareName, name, compareName] : undefined;
      const datasets = !compareData?.batches.length
        ? [data.batches, data.batches]
        : [data.batches, compareData.batches, data.batches, compareData.batches];
      const colors = !compareData?.batches.length
        ? [countingColorScale('Input'), countingColorScale('Output')]
        : [
            countingColorScale('Input'),
            countingColorScale('Output'),
            countingColorScale('compareInput'),
            countingColorScale('compareOutput'),
          ];
      const accessors = !compareData?.batches.length
        ? [(d: PerfDatum) => d.inputCount, (d: PerfDatum) => d.outputCount]
        : [
            (d: PerfDatum) => d.inputCount,
            (d: PerfDatum) => d.inputCount,
            (d: PerfDatum) => d.outputCount,
            (d: PerfDatum) => d.outputCount,
          ];
      ioTimestamps = !compareData?.batches.length
        ? data.batches.map((d) => d.timestamp)
        : getCombinedTimestamps([data.batches, compareData.batches]);
      ioData = combineDatasets(labels, colors, datasets, accessors, datasetNames);
    }

    if (data?.datasetMetrics) {
      const accuracy =
        data.datasetMetrics.find((datum) => datum.name === ACCURACY_NAME || datum.name === ACCURACY_METRIC_NAME)
          ?.values ?? [];
      const compare = compareData?.datasetMetrics
        ? compareData.datasetMetrics.find(
            (datum) => datum.name === ACCURACY_NAME || datum.name === ACCURACY_METRIC_NAME,
          )?.values ?? []
        : [];

      const labels = !compare.length ? ['Accuracy'] : [name, compareName];
      const datasets = !compare.length ? [accuracy] : [accuracy, compare];
      const colors = [accuracyColorScale('Accuracy'), accuracyColorScale('compareAccuracy')];
      const accessor = [(d: PerfDatum) => d.value, (d: PerfDatum) => d.value];

      accTimestamps = !compare.length ? accuracy.map((d) => d.timestamp) : getCombinedTimestamps([accuracy, compare]);
      accData = combineDatasets(labels, colors, datasets, accessor);
    }
    return [ioData, ioTimestamps, accData, accTimestamps];
  }, [data, compareData, combineDatasets, compareName, name]);

  if (error) {
    console.error('Error finding performance data', error);
  }

  let inputOutputHeroText: string | undefined;
  if (last) {
    const output = last.outputCount;
    const input = last.inputCount;
    // inputOutputHeroText = `${output} output${output !== 1 ? 's' : ''}, ${input} input${input !== 1 ? 's' : ''}`;
    inputOutputHeroText =
      output === input ? friendlyFormat(output) : `${friendlyFormat(input)}, ${friendlyFormat(output)}`;
  }

  const showRMSECard = () => {
    const { name: rmseName } =
      data?.datasetMetrics?.find((m) => m?.metadata?.queryDefinition?.metric === AnalysisMetric.RegressionRmse) ?? {};
    if (rmseName) return renderMetricCard(rmseName);
    return null;
  };

  const showAccuracyCard = () => {
    const accuracyMainModelData = data?.datasetMetrics?.find(
      (m) => m?.metadata?.queryDefinition?.metric === AnalysisMetric.ClassificationAccuracy,
    );
    const lastAccuracyData = accuracyMainModelData?.values?.[(accuracyMainModelData?.values?.length ?? 0) - 1];
    return (
      <MultiMetricLongCard
        id="accuracy-card"
        key="mmcard-accuracy"
        cardKey="mmcard-accuracy"
        data={accuracyData}
        timestamps={accuracyTimestamps}
        error={error}
        loading={loading}
        title="Accuracy"
        heroText={lastAccuracyData ? asPercentageIfNeeded(lastAccuracyData.value, true) || '0' : '0'}
        heroTimestamp={lastAccuracyData?.timestamp}
        noDataMessage="No accuracy data to display for the selected time period."
        batchFrequency={batchFrequency}
        showMonitorDropdown
        anomalies={anomalies?.filter((a) => a.metric === AnalysisMetric.ClassificationAccuracy)}
        isPercentage
        heroWidth={compareData ? 400 : undefined}
      />
    );
  };

  const getTitleName = (viewName: string): string => {
    if (viewName.toUpperCase() === MACROAUC_NAME.toUpperCase()) {
      return 'Macro AUC';
    }
    return SPECIAL_NAMES.includes(viewName) ? upperCaseFirstLetterOnly(viewName) : viewName;
  };

  const renderMetricCard = (metricName: string) => {
    const dmd = metricsMap.get(metricName);
    if (!dmd) {
      return null;
    }
    const viewName = hackSlice(dmd.name);
    const titleName = getTitleName(viewName);
    const compare = compareData?.datasetMetrics?.find((item) => item.name === dmd.name);
    const labels = compare ? [name, compareName] : [viewName];
    const colors = [accuracyColorScale.range()[0], accuracyColorScale.range()[1]];
    const datasets = compare ? [dmd.values, compare.values] : [dmd.values];
    const accessors = [(d: PerfDatum) => d.value, (d: PerfDatum) => d.value];
    const timestamps = getCombinedTimestamps(datasets);
    const chartData = combineDatasets(labels, colors, datasets, accessors);

    const { metric: targetMetric, column: targetColumn } = dmd.metadata?.queryDefinition ?? {};

    // filter anomalies by the metric and column that matches the chart
    const filteredAnomalies =
      anomalies?.filter((a) => {
        if (targetColumn && a.column !== targetColumn) {
          // if there is a target column specified for the metric (i.e. custom performance metric), filter on column name
          // if not (i.e. it's a dataset-level metric), ignore the column name
          return false;
        }

        // always make sure the metric matches the chart
        return a.metric === targetMetric;
      }) ?? [];

    return (
      <MultiMetricLongCard
        id={`${dmd.name}-card`}
        key={`mmcard-${dmd.name}`}
        cardKey={`mmcard-${dmd.name}`}
        data={chartData}
        timestamps={timestamps}
        error={error}
        loading={loading}
        title={titleName}
        heroText={
          dmd.values.length
            ? asPercentageIfNeeded(dmd.values[dmd.values.length - 1]?.value, !!dmd.metadata?.showAsPercent)
            : '0'
        }
        heroTimestamp={dmd.values[dmd.values.length - 1]?.timestamp}
        noDataMessage={`No ${viewName} data to display for the selected time period.`}
        anomalies={filteredAnomalies}
        batchFrequency={batchFrequency}
        showMonitorDropdown
        isPercentage={!!dmd.metadata?.showAsPercent}
        heroWidth={compareData ? 400 : undefined}
      />
    );
  };

  const metricHasData = (metricName: string) => {
    const metric = metricsMap.get(metricName);
    return !!metric?.values?.length;
  };

  const sortByDataAndAlphabetically = (metricNames: string[]) => {
    return metricNames.sort((a, b) => {
      const primaryHasData = metricHasData(a);
      const comparedHasData = metricHasData(b);
      return Number(comparedHasData) - Number(primaryHasData) || a.localeCompare(b);
    });
  };

  // Finally, split custom names and known names.
  const customMetricNames = (() => {
    const filtered = names.filter((n) => {
      const metric = metricsMap.get(n);
      return metric?.metadata?.source === MetricSource.UserDefined;
    });
    return sortByDataAndAlphabetically(filtered);
  })();

  const otherKnownMetricNames = (() => {
    const filtered =
      names?.filter(
        (n) =>
          !!n &&
          ![ACCURACY_METRIC_NAME, ACCURACY_NAME, RMSE_NAME, RMSE_METRIC_NAME].includes(n) &&
          (!n.includes(FILTERED_START) || SPECIAL_NAMES.includes(hackSlice(n))) &&
          !customMetricNames.includes(n),
      ) ?? [];

    return sortByDataAndAlphabetically(filtered);
  })();

  const renderConfusionMatrix = () => {
    return (
      <HeatMapView
        isLoading={loading}
        data={confusion?.counts ?? []}
        labels={confusion?.labels ?? []}
        info={confusionData?.timestamp ? timeLong(confusionData.timestamp) : ''}
        bumpProfile={(increase) => updateByKey('confusionIndex', increase)}
        hasNextProfile={() => hasNextByKey('confusionIndex')}
        hasPreviousProfile={() => hasPreviousByKey('confusionIndex')}
      />
    );
  };
  const renderWrappedConfusion = (renderAsRow: boolean) => {
    if (renderAsRow) {
      return (
        <VariableWidthCard height={SQUARES_HEIGHT} first>
          {renderConfusionMatrix()}
        </VariableWidthCard>
      );
    }
    return <VariableHeightCard width={getConfusionWidth(confusion)}>{renderConfusionMatrix()}</VariableHeightCard>;
  };

  const renderSpacerSquare = () => (
    <VariableWidthCard height={SQUARES_HEIGHT} spacerOnly>
      <div style={{ width: '100%', height: '100%' }} />
    </VariableWidthCard>
  );

  const renderConfusionRow = () => (
    <div className={styles.updatedSquaresContainer}>
      {renderWrappedConfusion(true)}
      {renderSpacerSquare()}
    </div>
  );

  // Boolean logic to determine which (if any) square rows to show
  const showSquareRow = !!(shouldShowClassification && !multiclass && data?.batches.length);

  return (
    <div className={styles.tabContainer}>
      {!!data?.batches.length && (
        <MultiMetricLongCard
          id="io-card"
          key="mmcard-io"
          cardKey="mmcard-io"
          data={inputOutputData}
          timestamps={inputOutputTimestamps}
          error={error}
          loading={loading}
          heroText={inputOutputHeroText}
          heroTimestamp={last?.timestamp}
          title="Total input and output count"
          noDataMessage="No I/O count data to display for the selected time period."
          batchFrequency={batchFrequency}
          heroWidth={compareData ? 400 : undefined}
          decimals={0}
        />
      )}
      {customMetricNames.map(renderMetricCard)}
      {shouldShowClassification && showAccuracyCard()}
      {shouldShowRegression && showRMSECard()}
      {otherKnownMetricNames.map(renderMetricCard)}
      {hasConfusion && renderConfusionRow()}
      {showSquareRow && (
        <div className={styles.updatedSquaresContainer}>
          <VariableWidthCard height={SQUARES_HEIGHT} first>
            <SquareCurveView
              xAxisTitle="False positive rate"
              yAxisTitle="True positive rate"
              isLoading={loading}
              name="ROC"
              data={
                rocAucData?.metrics.fprTpr?.values.map((datum) => ({
                  x: datum[0],
                  y: datum[1],
                })) ?? []
              }
              side={400}
              info={rocAucData ? timeLong(rocAucData.timestamp) : ''}
              bumpProfile={(increase) => updateByKey('rocAucIndex', increase)}
              hasNextProfile={() => hasNextByKey('rocAucIndex')}
              hasPreviousProfile={() => hasPreviousByKey('rocAucIndex')}
            />
          </VariableWidthCard>
          <VariableWidthCard height={SQUARES_HEIGHT}>
            <SquareCurveView
              xAxisTitle="Recall"
              yAxisTitle="Precision"
              isLoading={loading}
              name="Precision-Recall"
              side={400}
              data={
                precisionData?.metrics.recallPrecision?.values.map((datum) => ({
                  x: datum[0],
                  y: datum[1],
                })) ?? []
              }
              info={precisionData ? timeLong(precisionData.timestamp) : ''}
              bumpProfile={(increase) => updateByKey('precisionIndex', increase)}
              hasNextProfile={() => hasNextByKey('precisionIndex')}
              hasPreviousProfile={() => hasPreviousByKey('precisionIndex')}
            />
          </VariableWidthCard>
        </div>
      )}
    </div>
  );
};

export default PerformancePanel;

import { Colors } from '@whylabs/observatory-lib';
import { LinearBarGraph } from 'components/visualizations/linear-bar-graph/LinearBarGraph';
import { GraphParams } from 'generated/dashboard-schema';
import { KeysAndColors } from 'components/visualizations/dated-bar-stack/utils';
import { DatedBarStack } from 'components/visualizations/dated-bar-stack/DatedBarStack';
import { DatedCurvesGraph } from 'components/visualizations/dated-curves-graph/DatedCurvesGraph';
import { GraphLoadingSkeleton } from 'components/visualizations/components/GraphLoadingSkeleton';
import {
  DashCardGraphProps,
  LINEAR_GRAPH_WIDTH,
  makeBarData,
  makeDatedCurves,
  makeDatedStackedBars,
  TIME_SERIES_HEIGHT,
} from './utils';
import { toBinarySet } from '../helpers/cardReducers';

export const DashCardGraph: React.FC<DashCardGraphProps> = ({
  cardInfo,
  graphType,
  fieldValues,
  timeSeriesFieldValues,
  timeSeriesValues,
  toggleOnClickState,
  width,
}) => {
  const isTimeseries = ['stackedBarTimeSeries', 'timeSeries'].includes(graphType);
  const { subGrid } = cardInfo;
  const renderLineGraph = () => {
    if (!fieldValues || !subGrid) return null;
    const barData = makeBarData(fieldValues, subGrid);
    return (
      <LinearBarGraph
        layoutDimensionSize={LINEAR_GRAPH_WIDTH}
        layoutDimension="horizontal"
        crossDimensionSize={11}
        barData={barData}
        name={cardInfo.title.text}
      />
    );
  };

  const renderStackedGraph = () => {
    if (!timeSeriesFieldValues || !subGrid) return null;
    const colorKeys = subGrid.contents.reduce<KeysAndColors>(
      (acc, sgItem) => {
        acc.keys.push(sgItem.fieldId);
        acc.colors.push(sgItem.config?.colorInfo?.color ?? Colors.brandSecondary900);
        acc.names.push(sgItem.title.text);
        return acc;
      },
      { keys: [], colors: [], names: [] },
    );
    const stackedBars = makeDatedStackedBars(timeSeriesFieldValues, subGrid, colorKeys);
    const hiddenKeys = toBinarySet(toggleOnClickState);
    return (
      <DatedBarStack
        width={width}
        height={TIME_SERIES_HEIGHT}
        data={stackedBars}
        name={cardInfo.queryId}
        margin={{ top: 4, bottom: 4 }}
        colorKeys={colorKeys}
        hiddenKeys={hiddenKeys}
      />
    );
  };

  const renderLinearTimeseriesGraph = () => {
    if (!timeSeriesValues) return null;
    const edgedLinear = makeDatedCurves(timeSeriesValues, cardInfo.title);
    return (
      <DatedCurvesGraph
        width={width}
        height={TIME_SERIES_HEIGHT}
        data={edgedLinear}
        name={cardInfo.queryId}
        margin={{ top: 4, bottom: 4 }}
        graphParams={cardInfo.graphParams}
      />
    );
  };

  const graphTypeMapper = new Map<GraphParams['type'], () => JSX.Element | null>([
    ['lineChart', renderLineGraph],
    ['stackedBarTimeSeries', renderStackedGraph],
    ['timeSeries', renderLinearTimeseriesGraph],
  ]);

  const chartRenderer = graphTypeMapper.get(graphType);

  return (
    <>
      {chartRenderer &&
        (chartRenderer() ?? (
          <GraphLoadingSkeleton graphType={graphType} height={isTimeseries ? TIME_SERIES_HEIGHT : 8} />
        ))}
    </>
  );
};

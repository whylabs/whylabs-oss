import { useContext, useMemo } from 'react';
import { LineChartDatum } from 'types/graphTypes';
import { getThresholdDomain } from 'utils/analysisUtils';
import { getMinAndMaxValueFromArray } from 'utils/numberUtils';
import { lowerCase } from 'lodash';
import { AnalysisDataFragment, TimePeriod } from 'generated/graphql';
import { useResourceContext } from 'pages/model-page/hooks/useResourceContext';
import { LLMCardRowContext } from '../contexts/LLMCardRowContext';
import { CardColumnKey, mapContinuousMetricChartData } from '../../../utils';
import { getSharedYDomain } from '../utils';
import { LLMGraphCardContext } from '../contexts/LLMGraphCardContext';

type ContinuousMetricHandlerReturnType = {
  combinedDomain: [number, number];
  lineChartData: LineChartDatum[];
  graphLabel: string;
  batchFrequency?: TimePeriod;
  visualizationWidth: number;
};

export const useContinuousGraphViewModel = (
  analysisResults: AnalysisDataFragment[],
  columnKey: CardColumnKey,
): ContinuousMetricHandlerReturnType => {
  const [cardState] = useContext(LLMGraphCardContext);
  const [cardRowState, dispatchRow] = useContext(LLMCardRowContext);
  const { visualizationWidth } = cardState;
  const {
    resourceState: { resource },
  } = useResourceContext();
  const batchFrequency = resource?.batchFrequency;
  const {
    numericValues,
    name: metricName,
    metadata,
  } = cardState.metric ?? {
    numericValues: null,
    name: '',
  };
  const graphLabel = lowerCase(metadata?.queryDefinition?.metric ?? metricName);

  const lineChartData: LineChartDatum[] = useMemo(
    () => mapContinuousMetricChartData(numericValues, metricName),
    [numericValues, metricName],
  );

  const [graphMin, graphMax] = useMemo(() => {
    const thresholdDomain = getThresholdDomain(analysisResults);
    return getMinAndMaxValueFromArray([
      ...lineChartData.reduce<number[]>((acc, d) => [...acc, ...d.values], []),
      ...thresholdDomain,
    ]);
  }, [analysisResults, lineChartData]);

  const { min: contextMin, max: contextMax } = cardRowState[columnKey] ?? {};

  if (contextMin !== graphMin || contextMax !== graphMax) {
    dispatchRow({ [columnKey]: { min: graphMin, max: graphMax } });
  }

  const combinedDomain = getSharedYDomain(columnKey, cardRowState, { min: graphMin, max: graphMax });

  return {
    combinedDomain,
    lineChartData,
    graphLabel,
    batchFrequency,
    visualizationWidth,
  };
};

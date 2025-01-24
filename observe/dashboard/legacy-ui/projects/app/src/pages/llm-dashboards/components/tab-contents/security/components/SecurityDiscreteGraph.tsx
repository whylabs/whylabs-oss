import { useContext, useMemo } from 'react';
import { lowerCase } from 'lodash';
import { StackedCategoryVisxChart } from 'components/visualizations/stacked-category-chart/StackedCategoryVisxChart';
import { AnalysisDataFragment, TimePeriod } from 'generated/graphql';
import { useResourceContext } from 'pages/model-page/hooks/useResourceContext';
import { getMinAndMaxValueFromArray } from 'utils/numberUtils';
import { CardColumnKey } from 'pages/llm-dashboards/utils';
import { SimpleDateRange } from 'utils/dateRangeUtils';
import { LLMGraphCardContext } from '../../contexts/LLMGraphCardContext';
import { DEFAULT_GRAPH_HEIGHT, getSharedYDomain } from '../../utils';
import { LLMCardRowContext } from '../../contexts/LLMCardRowContext';

interface SecurityDiscreteGraphProps {
  analysisResults: AnalysisDataFragment[];
  usedTimestamps: SimpleDateRange;
  columnKey: CardColumnKey;
}
export const SecurityDiscreteGraph: React.FC<SecurityDiscreteGraphProps> = ({
  analysisResults,
  usedTimestamps,
  columnKey,
}) => {
  const [cardState] = useContext(LLMGraphCardContext);
  const [cardRowState, dispatchRow] = useContext(LLMCardRowContext);

  const {
    resourceState: { resource },
  } = useResourceContext();
  const currentResourceBatchFrequency = resource?.batchFrequency ?? null;

  const { visualizationWidth } = cardState;
  const { distributionValues, name, metadata } = cardState.metric ?? {
    distributionValues: null,
    name: '',
  };
  const graphLabel = lowerCase(metadata?.queryDefinition?.metric ?? name);

  const [graphMin, graphMax] = useMemo(() => {
    const accValues =
      distributionValues?.map((item) => {
        return item?.frequentItems?.reduce((acc, d) => {
          return acc + (d?.estimate ?? 0);
        }, 0);
      }) ?? [];

    return getMinAndMaxValueFromArray(accValues);
  }, [distributionValues]);

  const { min: contextMin, max: contextMax } = cardRowState[columnKey] ?? {};

  if (contextMin !== graphMin || contextMax !== graphMax) {
    dispatchRow({ [columnKey]: { min: graphMin, max: graphMax } });
  }

  const combinedDomain = getSharedYDomain(columnKey, cardRowState, { min: graphMin, max: graphMax });

  return (
    <StackedCategoryVisxChart
      batchFrequency={currentResourceBatchFrequency ?? TimePeriod.P1D}
      distributionValues={distributionValues ?? []}
      fixedYRange={combinedDomain}
      analysisResults={analysisResults}
      dateRange={[usedTimestamps.from, usedTimestamps.to]}
      cardType="security"
      height={DEFAULT_GRAPH_HEIGHT}
      width={visualizationWidth}
      label={graphLabel}
      horizontalBuffer={48}
      endHorizontalBuffer={16}
      navigationInformation={{
        resourceId: cardState.metric?.datasetId ?? '',
        segment: { tags: cardState.metric?.segmentTags ?? [] },
        columnId: cardState.metric?.name ?? '',
        customDateRange: usedTimestamps,
      }}
    />
  );
};

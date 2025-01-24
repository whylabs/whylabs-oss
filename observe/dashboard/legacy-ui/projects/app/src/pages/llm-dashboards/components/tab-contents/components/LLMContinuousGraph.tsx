import FlexibleLineVisxChart from 'components/visualizations/simple-line-chart/FlexibleLineVisxChart';
import { AnalysisDataFragment } from 'generated/graphql';
import { ParsedSegment } from 'pages/page-types/pageUrlQuery';
import { SimpleDateRange } from 'utils/dateRangeUtils';
import { DEFAULT_GRAPH_HEIGHT } from '../utils';
import { CardColumnKey } from '../../../utils';
import { useContinuousGraphViewModel } from '../hooks/useContinuousGraphViewModel';

interface LLMContinuousGraphProps {
  analysisResults: AnalysisDataFragment[];
  usedTimestamps: SimpleDateRange;
  columnKey: CardColumnKey;
  name: string;
  navigationInformation?: {
    resourceId?: string;
    segment?: ParsedSegment;
    columnId?: string;
    customDateRange?: SimpleDateRange;
  };
}
export const LLMContinuousGraph: React.FC<LLMContinuousGraphProps> = ({
  analysisResults,
  usedTimestamps,
  columnKey,
  name,
  navigationInformation,
}) => {
  const { lineChartData, batchFrequency, graphLabel, combinedDomain, visualizationWidth } = useContinuousGraphViewModel(
    analysisResults,
    columnKey,
  );

  return (
    <FlexibleLineVisxChart
      analysisResults={analysisResults}
      name={name}
      navigationInformation={navigationInformation}
      datedData={lineChartData}
      dateRange={[usedTimestamps.from, usedTimestamps.to]}
      width={visualizationWidth}
      height={DEFAULT_GRAPH_HEIGHT}
      graphLabel={graphLabel}
      batchFrequency={batchFrequency}
      fixedYRange={combinedDomain}
    />
  );
};

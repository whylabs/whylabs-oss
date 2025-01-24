import { Colors } from '~/assets/Colors';
import { createAxisTickPositioner } from '~/components/chart/chart-utils';
import { ChartCard } from '~/components/chart/ChartCard';
import { ChartCardExtraLegends } from '~/components/chart/ChartCardExtraLegends';
import { TimeSeriesChart } from '~/components/chart/TimeSeriesChart';
import { ChartOnClickPosition, ChartPointOptions } from '~/components/chart/types/chart-types';
import { GRAPH_TICK_AMOUNT } from '~/routes/:orgId/:resourceId/llm-trace/summary/components/policyActivityChartsUtil';
import { createLatencyText } from '~server/util/latency-utils';
import { useCallback, useState } from 'react';

import { useLlmTraceSummaryViewModel } from '../useLlmTraceSummaryViewModel';
import { useTraceSummaryChartStyles } from './useTraceSummaryChartStyles';

const CHART_ID = 'llm-trace-average-latency-per-interactions-chart';
const OVERALL_SERIES_COLOR = Colors.chartPrimary;
const OVERALL_SERIES_ID = 'overall-avg-latency-series';
const OVERALL_SERIES_NAME = 'Overall avg. latency';

const MENU_OFFSET = 70;
const MENU_WIDTH = 160;

type LlmTraceLatencyInteractionChartProps = {
  viewModel: ReturnType<typeof useLlmTraceSummaryViewModel>;
};

type OnClickSeriesType = ChartOnClickPosition & {
  timestamp: number;
};

export const LlmTraceLatencyInteractionChart = ({ viewModel }: LlmTraceLatencyInteractionChartProps) => {
  const { classes } = useTraceSummaryChartStyles();
  const { data, isLoading, graphUsedDateRange } = viewModel;
  const { latencyPerInteraction } = data ?? {};

  const [seriesIsDisabled, setSeriesIsDisabled] = useState(false);
  const [displaySeriesMenuContext, setDisplaySeriesMenuContext] = useState<OnClickSeriesType | null>(null);

  const onCloseMenuContext = useCallback(() => {
    setDisplaySeriesMenuContext(null);
  }, [setDisplaySeriesMenuContext]);

  const onClickSeries = (position: ChartOnClickPosition, options: ChartPointOptions) => {
    setDisplaySeriesMenuContext({
      ...position,
      timestamp: options.x ?? 0,
    });
  };

  const onClickToViewRelatedTraces = () => {
    if (!displaySeriesMenuContext) return;

    viewModel.onClickToFilterRelatedTraces(displaySeriesMenuContext.timestamp);
  };

  const averageValue = latencyPerInteraction?.average ?? 0;

  return (
    <ChartCard
      classNames={{
        root: classes.card,
        titleContainer: classes.cardTitleContainer,
      }}
      displayMenuContext={
        displaySeriesMenuContext
          ? {
              ...displaySeriesMenuContext,
              items: [
                {
                  label: 'View related traces',
                  onClick: onClickToViewRelatedTraces,
                },
              ],
              onClose: onCloseMenuContext,
              width: MENU_WIDTH,
            }
          : undefined
      }
      title="Avg. latency per interaction"
      titleRightChildren={
        <ChartCardExtraLegends
          chartId={CHART_ID}
          isLoading={isLoading}
          legends={[
            {
              color: OVERALL_SERIES_COLOR,
              isDisabled: seriesIsDisabled,
              name: OVERALL_SERIES_NAME,
              seriesId: OVERALL_SERIES_ID,
              value: createLatencyText(averageValue),
            },
          ]}
        />
      }
    >
      <TimeSeriesChart
        description="Chart showing the average latency per interaction over time"
        height={220}
        id={CHART_ID}
        isLoading={isLoading}
        onClickChartBackground={onCloseMenuContext}
        onSeriesToggle={(seriesId, isVisible) => {
          if (seriesId !== OVERALL_SERIES_ID) return;
          setSeriesIsDisabled(!isVisible);
        }}
        series={[
          {
            type: 'line',
            color: Colors.chartBlue,
            contextMenu: {
              offset: MENU_OFFSET,
              width: MENU_WIDTH,
            },
            data: latencyPerInteraction?.latency ?? [],
            id: 'average-latency-series',
            name: 'Avg. latency',
            onClick: onClickSeries,
          },
          {
            type: 'annotation-line',
            color: OVERALL_SERIES_COLOR,
            data: latencyPerInteraction?.averageData ?? [],
            id: OVERALL_SERIES_ID,
            name: OVERALL_SERIES_NAME,
          },
        ]}
        spec={{
          xAxis: {
            min: graphUsedDateRange.from,
            max: graphUsedDateRange.to,
            allowZooming: true,
          },
          yAxis: [
            {
              tickPositioner() {
                // @ts-expect-error - its an valid value as in https://api.hcplaceholder.com/hcplaceholder/xAxis.tickPositioner
                const { dataMax: max, dataMin: min } = this;
                return createAxisTickPositioner({ min, max, ticksAmount: GRAPH_TICK_AMOUNT });
              },
              title: 'milliseconds',
              tickAmount: GRAPH_TICK_AMOUNT,
            },
          ],
        }}
      />
    </ChartCard>
  );
};

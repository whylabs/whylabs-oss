import { useState } from 'react';
import { Colors } from '~/assets/Colors';
import { createAxisTickPositioner } from '~/components/chart/chart-utils';
import { ChartCard } from '~/components/chart/ChartCard';
import { ChartCardExtraLegends } from '~/components/chart/ChartCardExtraLegends';
import { TimeSeriesChart } from '~/components/chart/TimeSeriesChart';
import { ChartOnClickPosition, ChartPointOptions } from '~/components/chart/types/chart-types';
import { GRAPH_TICK_AMOUNT } from '~/routes/:resourceId/llm-trace/summary/components/policyActivityChartsUtil';

import { useLlmTraceSummaryViewModel } from '../useLlmTraceSummaryViewModel';
import { useTraceSummaryChartStyles } from './useTraceSummaryChartStyles';

const CHART_ID = 'llm-trace-total-tokens-chart';
const TOKEN_COUNT_SERIES_COLOR = Colors.chartOrange;
const TOKEN_COUNT_SERIES_ID = 'totalTokens';
const TOKEN_AVERAGE_SERIES_COLOR = Colors.chartPrimary;
const TOKEN_AVERAGE_SERIES_ID = 'averageTokens';
const TOKEN_AVERAGE_SERIES_NAME = 'Token avg.';

const MENU_OFFSET = 70;
const MENU_WIDTH = 160;

type OnClickSeriesType = ChartOnClickPosition & {
  timestamp: number;
};

type LlmTraceTotalTokensChartProps = {
  viewModel: ReturnType<typeof useLlmTraceSummaryViewModel>;
};

export const LlmTraceTotalTokensChart = ({ viewModel }: LlmTraceTotalTokensChartProps) => {
  const { classes } = useTraceSummaryChartStyles();

  const { data, isLoading, graphUsedDateRange } = viewModel;
  const { totalTokens } = data ?? {};

  const [seriesIsDisabled, setSeriesIsDisabled] = useState<Record<string, boolean>>({
    [TOKEN_COUNT_SERIES_ID]: false,
    [TOKEN_AVERAGE_SERIES_ID]: false,
  });
  const [displaySeriesMenuContext, setDisplaySeriesMenuContext] = useState<OnClickSeriesType | null>(null);

  const onClickSeries = (position: ChartOnClickPosition, options: ChartPointOptions) => {
    setDisplaySeriesMenuContext({
      ...position,
      timestamp: options.x ?? 0,
    });
  };

  const onCloseMenuContext = () => {
    setDisplaySeriesMenuContext(null);
  };

  const onClickToViewRelatedTraces = () => {
    if (!displaySeriesMenuContext) return;

    viewModel.onClickToFilterRelatedTraces(displaySeriesMenuContext.timestamp);
  };

  const averageValue = totalTokens?.average ?? 0;

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
      title="Total tokens"
      titleRightChildren={
        <ChartCardExtraLegends
          chartId={CHART_ID}
          isLoading={isLoading}
          legends={[
            {
              color: TOKEN_COUNT_SERIES_COLOR,
              isDisabled: !!seriesIsDisabled[TOKEN_COUNT_SERIES_ID],
              name: 'Total tokens',
              seriesId: TOKEN_COUNT_SERIES_ID,
              value: totalTokens?.total ?? 0,
            },
            {
              color: TOKEN_AVERAGE_SERIES_COLOR,
              isDisabled: !!seriesIsDisabled[TOKEN_AVERAGE_SERIES_ID],
              name: TOKEN_AVERAGE_SERIES_NAME,
              seriesId: TOKEN_AVERAGE_SERIES_ID,
              value: averageValue,
            },
          ]}
        />
      }
    >
      <TimeSeriesChart
        description="Chart showing the total tokens usage over time"
        height={220}
        id={CHART_ID}
        isLoading={isLoading}
        onClickChartBackground={onCloseMenuContext}
        onSeriesToggle={(seriesId: string, isVisible: boolean) => {
          setSeriesIsDisabled((prev) => {
            if (!seriesId) return prev;
            return {
              ...prev,
              [seriesId]: !isVisible,
            };
          });
        }}
        series={[
          {
            type: 'line',
            color: TOKEN_COUNT_SERIES_COLOR,
            contextMenu: {
              offset: MENU_OFFSET,
              width: MENU_WIDTH,
            },
            data: totalTokens?.tokens ?? [],
            id: TOKEN_COUNT_SERIES_ID,
            name: 'Tokens count',
            onClick: onClickSeries,
          },
          {
            type: 'annotation-line',
            color: TOKEN_AVERAGE_SERIES_COLOR,
            contextMenu: {
              offset: MENU_OFFSET,
              width: MENU_WIDTH,
            },
            data: totalTokens?.tokensAverageData ?? [],
            id: TOKEN_AVERAGE_SERIES_ID,
            name: TOKEN_AVERAGE_SERIES_NAME,
            onClick: onClickSeries,
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
              title: 'Count',
              tickAmount: GRAPH_TICK_AMOUNT,
            },
          ],
        }}
      />
    </ChartCard>
  );
};

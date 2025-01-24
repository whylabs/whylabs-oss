import { Colors } from '~/assets/Colors';
import { createAxisTickPositioner } from '~/components/chart/chart-utils';
import { ChartCard } from '~/components/chart/ChartCard';
import { ChartCardExtraLegends } from '~/components/chart/ChartCardExtraLegends';
import { TimeSeriesChart } from '~/components/chart/TimeSeriesChart';
import { ChartOnClickPosition, ChartPointOptions, ChartTimeSeries } from '~/components/chart/types/chart-types';
import { GRAPH_TICK_AMOUNT } from '~/routes/:orgId/:resourceId/llm-trace/summary/components/policyActivityChartsUtil';
import { useState } from 'react';

import { useLlmTraceSummaryViewModel } from '../useLlmTraceSummaryViewModel';
import { useTraceSummaryChartStyles } from './useTraceSummaryChartStyles';

const WITH_ISSUES_COLOR = Colors.purple;
const WITH_ISSUES_ID = 'withIssues';
const WITHOUT_ISSUES_COLOR = Colors.secondaryLight900;
const WITHOUT_ISSUES_ID = 'withoutIssues';

const MENU_OFFSET = 70;
const MENU_WIDTH = 160;

const CHART_ID = 'llm-trace-interactions-chart';

type OnClickSeriesType = ChartOnClickPosition & {
  id: string;
  timestamp: number;
};

type LlmTraceInteractionsColumnChartProps = {
  viewModel: ReturnType<typeof useLlmTraceSummaryViewModel>;
};

export const LlmTraceInteractionsColumnChart = ({ viewModel }: LlmTraceInteractionsColumnChartProps) => {
  const { classes } = useTraceSummaryChartStyles();

  const { data, isLoading, graphUsedDateRange } = viewModel;
  const { totalInteractions } = data ?? {};

  const [seriesIsDisabled, setSeriesIsDisabled] = useState<Record<string, boolean>>({
    [WITH_ISSUES_ID]: false,
    [WITHOUT_ISSUES_ID]: false,
  });

  const [displaySeriesMenuContext, setDisplaySeriesMenuContext] = useState<OnClickSeriesType | null>(null);

  const onClickSeries = (id: string) => {
    return (position: ChartOnClickPosition, options: ChartPointOptions) => {
      setDisplaySeriesMenuContext({
        ...position,
        id,
        timestamp: options.x ?? 0,
      });
    };
  };

  const onCloseMenuContext = () => {
    setDisplaySeriesMenuContext(null);
  };

  const onClickToViewRelatedTraces = () => {
    if (!displaySeriesMenuContext) return;

    const isWithIssuesSeries = displaySeriesMenuContext.id === WITH_ISSUES_ID;
    const condition = isWithIssuesSeries ? '>' : '<';
    const value = isWithIssuesSeries ? '0' : '1';
    viewModel.onClickToFilterPolicyIssueTraces(displaySeriesMenuContext.timestamp, condition, value);
  };

  const series: ChartTimeSeries[] = [
    {
      type: 'column',
      color: WITH_ISSUES_COLOR,
      contextMenu: {
        offset: MENU_OFFSET,
        width: MENU_WIDTH,
      },
      data: totalInteractions?.withIssues ?? [],
      id: WITH_ISSUES_ID,
      name: 'Interactions with policy issues',
      onClick: onClickSeries(WITH_ISSUES_ID),
    },
    {
      type: 'column',
      color: WITHOUT_ISSUES_COLOR,
      contextMenu: {
        offset: MENU_OFFSET,
        width: MENU_WIDTH,
      },
      data: totalInteractions?.withoutIssues ?? [],
      id: WITHOUT_ISSUES_ID,
      name: 'Interactions without policy issues',
      onClick: onClickSeries(WITHOUT_ISSUES_ID),
    },
  ];

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
      title="Interactions"
      titleRightChildren={
        <ChartCardExtraLegends
          chartId={CHART_ID}
          isLoading={isLoading}
          legends={[
            {
              color: WITH_ISSUES_COLOR,
              isDisabled: seriesIsDisabled[WITH_ISSUES_ID] ?? false,
              name: 'Policy violations',
              seriesId: WITH_ISSUES_ID,
              value: totalInteractions?.withIssuesSum ?? 0,
            },
            {
              color: WITHOUT_ISSUES_COLOR,
              isDisabled: seriesIsDisabled[WITHOUT_ISSUES_ID] ?? false,
              name: 'No policy violations',
              seriesId: WITHOUT_ISSUES_ID,
              value: totalInteractions?.withoutIssuesSum ?? 0,
            },
          ]}
        />
      }
    >
      <TimeSeriesChart
        description="Chart showing the trace interactions over time"
        height={220}
        id={CHART_ID}
        isLoading={isLoading}
        onClickChartBackground={onCloseMenuContext}
        onSeriesToggle={(seriesId, isVisible) => {
          setSeriesIsDisabled((prev) => {
            if (!seriesId) return prev;
            return {
              ...prev,
              [seriesId]: !isVisible,
            };
          });
        }}
        series={series}
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
                const usedMin = min < 0 ? min : 0;
                return createAxisTickPositioner({ min: usedMin, max, ticksAmount: GRAPH_TICK_AMOUNT });
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

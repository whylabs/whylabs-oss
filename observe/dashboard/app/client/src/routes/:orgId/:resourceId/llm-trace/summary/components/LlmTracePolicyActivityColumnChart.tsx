import { createAxisTickPositioner } from '~/components/chart/chart-utils';
import { ChartCard } from '~/components/chart/ChartCard';
import { ChartCardExtraLegends } from '~/components/chart/ChartCardExtraLegends';
import { TimeSeriesChart } from '~/components/chart/TimeSeriesChart';
import { ChartOnClickPosition, ChartPointOptions, ChartTimeSeries } from '~/components/chart/types/chart-types';
import { useState } from 'react';

import { useLlmTraceSummaryViewModel } from '../useLlmTraceSummaryViewModel';
import {
  BLOCKED_COLOR,
  BLOCKED_ID,
  BLOCKED_NAME,
  FLAGGED_COLOR,
  FLAGGED_ID,
  FLAGGED_NAME,
  GRAPH_TICK_AMOUNT,
} from './policyActivityChartsUtil';
import { useTraceSummaryChartStyles } from './useTraceSummaryChartStyles';

const MENU_OFFSET = 70;
const MENU_WIDTH = 160;

const CHART_ID = 'llm-trace-policy-activity-column-chart';

type OnClickSeriesType = ChartOnClickPosition & {
  id: string;
  timestamp: number;
};

type LlmTracePolicyActivityColumnChartProps = {
  viewModel: ReturnType<typeof useLlmTraceSummaryViewModel>;
};

export const LlmTracePolicyActivityColumnChart = ({ viewModel }: LlmTracePolicyActivityColumnChartProps) => {
  const { classes } = useTraceSummaryChartStyles();

  const { data, isLoading, graphUsedDateRange } = viewModel;
  const { blocked, flagged } = data?.policyActivity || {};

  const [seriesIsDisabled, setSeriesIsDisabled] = useState<Record<string, boolean>>({
    [BLOCKED_ID]: false,
    [FLAGGED_ID]: false,
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

    viewModel.onClickToFilterPolicyIssueTraces(displaySeriesMenuContext.timestamp, '>', '0');
  };

  const series: ChartTimeSeries[] = [
    {
      type: 'column',
      color: BLOCKED_COLOR,
      contextMenu: {
        offset: MENU_OFFSET,
        width: MENU_WIDTH,
      },
      data: blocked?.data ?? [],
      id: BLOCKED_ID,
      name: BLOCKED_NAME,
      onClick: onClickSeries(BLOCKED_ID),
    },
    {
      type: 'column',
      color: FLAGGED_COLOR,
      contextMenu: {
        offset: MENU_OFFSET,
        width: MENU_WIDTH,
      },
      data: flagged?.data ?? [],
      id: FLAGGED_ID,
      name: FLAGGED_NAME,
      onClick: onClickSeries(FLAGGED_ID),
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
      title="Policy activity"
      titleRightChildren={
        <ChartCardExtraLegends
          chartId={CHART_ID}
          isLoading={isLoading}
          legends={[
            {
              color: BLOCKED_COLOR,
              isDisabled: seriesIsDisabled[BLOCKED_ID] ?? false,
              name: BLOCKED_NAME,
              seriesId: BLOCKED_ID,
              value: blocked?.total ?? 0,
            },
            {
              color: FLAGGED_COLOR,
              isDisabled: seriesIsDisabled[FLAGGED_ID] ?? false,
              name: FLAGGED_NAME,
              seriesId: FLAGGED_ID,
              value: flagged?.total ?? 0,
            },
          ]}
        />
      }
    >
      <TimeSeriesChart
        description="Chart showing the policy activity over time"
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
                const usedMin = Math.min(0, min);
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

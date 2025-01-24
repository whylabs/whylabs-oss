import { Colors } from '~/assets/Colors';
import { ChartCard } from '~/components/chart/ChartCard';
import { PieChart } from '~/components/chart/PieChart';
import { WhyLabsBadge } from '~/components/design-system';
import { rangePickerDate } from '~/utils/dateUtils';

import { useLlmTraceSummaryViewModel } from '../useLlmTraceSummaryViewModel';
import { useTraceSummaryChartStyles } from './useTraceSummaryChartStyles';

const WITH_ISSUES_COLOR = Colors.purple;
const WITHOUT_ISSUES_COLOR = Colors.secondaryLight900;

const CHART_ID = 'llm-trace-total-interactions-pie-chart';

type LlmTraceTotalInteractionsChartProps = {
  viewModel: ReturnType<typeof useLlmTraceSummaryViewModel>;
};

export const LlmTraceTotalInteractionsPieChart = ({ viewModel }: LlmTraceTotalInteractionsChartProps) => {
  const { classes } = useTraceSummaryChartStyles();

  const { data, isLoading, graphUsedDateRange } = viewModel;
  const { totalInteractions } = data ?? {};

  return (
    <ChartCard
      classNames={{
        root: classes.card,
        titleContainer: classes.cardTitleContainer,
      }}
      titleRightChildren={
        graphUsedDateRange && (
          <WhyLabsBadge customBackground={Colors.secondaryLight200} customColor={Colors.secondaryLight1000} radius="xl">
            {rangePickerDate(graphUsedDateRange.from)} to {rangePickerDate(graphUsedDateRange.to)}
          </WhyLabsBadge>
        )
      }
      title="Total interactions"
    >
      <PieChart
        description="Pie chart showing the total trace interactions with and without policy violations."
        data={[
          {
            color: WITH_ISSUES_COLOR,
            name: 'Has policy violations',
            value: totalInteractions?.withIssuesSum ?? 0,
          },
          {
            color: WITHOUT_ISSUES_COLOR,
            name: 'Has no policy violations',
            value: totalInteractions?.withoutIssuesSum ?? 0,
          },
        ]}
        height={230}
        margin={[0, 0, 0, 0]}
        id={CHART_ID}
        isLoading={isLoading}
      />
    </ChartCard>
  );
};

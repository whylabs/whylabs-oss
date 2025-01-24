import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import { ChartCard } from '~/components/chart/ChartCard';
import { PieChart } from '~/components/chart/PieChart';
import { WhyLabsBadge } from '~/components/design-system';
import { rangePickerDate } from '~/utils/dateUtils';

import { useLlmTraceSummaryViewModel } from '../useLlmTraceSummaryViewModel';
import { BLOCKED_COLOR, BLOCKED_NAME, FLAGGED_COLOR, FLAGGED_NAME } from './policyActivityChartsUtil';

const CHART_ID = 'llm-trace-policy-activity-pie-chart';

const useStyles = createStyles(() => ({
  card: {
    height: 275,
    minHeight: 275,
  },
  cardTitleContainer: {
    marginBottom: 0,
  },
}));

type LlmTraceTotalPolicyActivityPieChartProps = {
  viewModel: ReturnType<typeof useLlmTraceSummaryViewModel>;
};

export const LlmTraceTotalPolicyActivityPieChart = ({ viewModel }: LlmTraceTotalPolicyActivityPieChartProps) => {
  const { classes } = useStyles();

  const { data, isLoading, graphUsedDateRange } = viewModel;
  const { blocked, flagged } = data?.policyActivity || {};

  return (
    <ChartCard
      classNames={{
        root: classes.card,
        titleContainer: classes.cardTitleContainer,
      }}
      title="Total policy activity"
      titleRightChildren={
        graphUsedDateRange && (
          <WhyLabsBadge customBackground={Colors.secondaryLight200} customColor={Colors.secondaryLight1000} radius="xl">
            {rangePickerDate(graphUsedDateRange.from)} to {rangePickerDate(graphUsedDateRange.to)}
          </WhyLabsBadge>
        )
      }
    >
      <PieChart
        description="Pie chart showing the total policy activities, including blocked nad flagged interactions."
        data={[
          {
            color: BLOCKED_COLOR,
            name: BLOCKED_NAME,
            value: blocked?.total ?? 0,
          },
          {
            color: FLAGGED_COLOR,
            name: FLAGGED_NAME,
            value: flagged?.total ?? 0,
          },
        ]}
        height={230}
        id={CHART_ID}
        isLoading={isLoading}
        margin={[0, 0, 0, 0]}
      />
    </ChartCard>
  );
};

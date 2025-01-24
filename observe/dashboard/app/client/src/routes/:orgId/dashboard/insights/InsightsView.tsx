import { Flex, createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import { WhyLabsBadge, WhyLabsText } from '~/components/design-system';
import { InsightTypeBadge } from '~/routes/:orgId/dashboard/insights/InsightTypeBadge';
import { RouterOutputs } from '~/utils/trpc';

const useStyles = createStyles(() => ({
  insightMessage: {
    display: 'inline',
    marginLeft: '8px',
    color: Colors.brandSecondary900,
    fontSize: '14px',
  },
  metricWrapper: {
    minWidth: 'fit-content',
  },
  emptyState: {
    display: 'flex',
    width: '100%',
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
}));

interface InsightsViewProps {
  insights: RouterOutputs['dashboard']['insights']['getForSingleProfile'];
}
export const InsightsView = ({ insights }: InsightsViewProps) => {
  const { classes } = useStyles();

  if (!insights.length)
    return (
      <div className={classes.emptyState}>
        <WhyLabsText>No insights found.</WhyLabsText>
      </div>
    );
  return (
    <Flex direction="column" gap="md">
      {insights.map(({ message, column, name }) => (
        <Flex direction="row" gap="sm" justify="space-between" align="center" key={`${name}--${column}--insight`}>
          <div>
            <div style={{ display: 'inline' }}>
              <WhyLabsBadge
                size="lg"
                maxWidth={200}
                radius={50}
                customColor={Colors.brandPrimary900}
                customBackground={Colors.lightGray}
              >
                {column}
              </WhyLabsBadge>
              <WhyLabsText className={classes.insightMessage}>{message}</WhyLabsText>
            </div>
          </div>
          <div className={classes.metricWrapper}>
            <InsightTypeBadge insightType={name} />
          </div>
        </Flex>
      ))}
    </Flex>
  );
};

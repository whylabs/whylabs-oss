import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import { ChartCard } from '~/components/chart/ChartCard';
import { InvisibleButton } from '~/components/misc/InvisibleButton';
import { useFlags } from '~/hooks/useFlags';
import { WidgetCreationButtons } from '~/routes/:orgId/dashboard/:dashboardId/components/WidgetCreationButtons';

const useStyles = createStyles({
  root: {
    flex: 1,
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  createWidget: {
    color: Colors.chartBlue,
    fontSize: 16,
    lineHeight: 1,
    fontWeight: 400,
    width: 'fit-content',
  },
  card: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  createGraphButton: {
    color: Colors.secondaryLight1000,
    fontSize: 13,
    fontWeight: 600,
  },
});
export const EmptyStateGraphPanel = ({
  isViewer,
  openWidgetCreation,
}: {
  isViewer?: boolean | null;
  openWidgetCreation: () => void;
}) => {
  const { classes } = useStyles();
  const flags = useFlags();

  if (flags.customDashComparisonWidgets) {
    return (
      <div className={classes.root}>
        <InvisibleButton className={classes.createWidget} onClick={openWidgetCreation}>
          Click to add a widget
        </InvisibleButton>
      </div>
    );
  }

  return (
    <ChartCard classNames={{ root: classes.card }}>
      <WidgetCreationButtons isViewer={isViewer} />
    </ChartCard>
  );
};

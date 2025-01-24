import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import WhyLabsLinkButton from '~/components/design-system/button/WhyLabsLinkButton';
import { useFlags } from '~/hooks/useFlags';
import { useNavLinkHandler } from '~/hooks/useWhylabsNavigation';
import { useDashboardIdLayoutContext } from '~/routes/:orgId/dashboard/:dashboardId/layout/DashboardIdLayout';
import { AppRoutePaths } from '~/types/AppRoutePaths';
import { ReactElement } from 'react';

const useStyles = createStyles({
  wrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  createGraphButton: {
    color: Colors.secondaryLight1000,
    fontSize: 13,
    fontWeight: 600,
  },
});

export const WidgetCreationButtons = ({ isViewer }: { isViewer?: boolean | null }): ReactElement => {
  const { classes } = useStyles();
  const { dashboardId } = useDashboardIdLayoutContext();
  const { getNavUrl } = useNavLinkHandler();
  const flags = useFlags();

  const buttonProps = {
    className: classes.createGraphButton,
    color: 'gray',
    variant: 'filled',
    loading: isViewer === null,
    disabled: !!isViewer,
    disabledTooltip: 'Dashboard cannot be edited by a viewer',
  } as const;

  return (
    <div className={classes.wrapper}>
      <WhyLabsLinkButton
        buttonProps={buttonProps}
        to={getNavUrl({
          page: 'dashboards',
          dashboards: { dashboardId, graphId: AppRoutePaths.newWidget },
        })}
      >
        Add graph
      </WhyLabsLinkButton>
      {flags.customDashComparisonWidgets && (
        <>
          <WhyLabsLinkButton
            buttonProps={buttonProps}
            to={getNavUrl({
              page: 'dashboards',
              dashboards: { dashboardId, graphId: AppRoutePaths.newWidget },
              setParams: [{ name: 'widgetType', value: 'dataComparison' }],
            })}
          >
            Add a data comparison
          </WhyLabsLinkButton>
          <WhyLabsLinkButton
            buttonProps={buttonProps}
            to={getNavUrl({
              page: 'dashboards',
              dashboards: { dashboardId, graphId: AppRoutePaths.newWidget },
              setParams: [{ name: 'widgetType', value: 'metricComparison' }],
            })}
          >
            Add a metric comparison
          </WhyLabsLinkButton>
        </>
      )}
    </div>
  );
};

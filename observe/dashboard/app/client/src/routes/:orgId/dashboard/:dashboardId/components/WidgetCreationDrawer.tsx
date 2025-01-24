import { createStyles } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { Colors } from '~/assets/Colors';
import dataComparisonIcon from '~/assets/data-comparison-icon.svg';
import metricComparisonIcon from '~/assets/metric-comparison-icon.svg';
import pieChartIcon from '~/assets/pie-chart-icon.svg';
import timeseriesIcon from '~/assets/timeseries-icon.svg';
import { WhyLabsAlert, WhyLabsDrawer, WhyLabsText, WhyLabsTooltip } from '~/components/design-system';
import ExternalLink from '~/components/link/ExternalLink';
import { useFlags } from '~/hooks/useFlags';
import { useNavLinkHandler } from '~/hooks/useWhylabsNavigation';
import { useDashboardIdLayoutContext } from '~/routes/:orgId/dashboard/:dashboardId/layout/DashboardIdLayout';
import { DrawerState, needPermissionToCreateWidgetsTooltip } from '~/routes/:orgId/dashboard/:dashboardId/utils';
import { AppRoutePaths } from '~/types/AppRoutePaths';
import { ReactElement } from 'react';
import { Link } from 'react-router-dom';

const useStyles = createStyles({
  root: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  content: {
    padding: `0 16px`,
    display: 'flex',
    flexDirection: 'column',
    gap: 15,
    flex: 1,
  },
  drawerBody: {
    padding: 4,
  },
  drawerHeader: {
    padding: 20,
    paddingBottom: 15,
  },
  drawerTitle: {
    fontSize: 15,
    fontWeight: 700,
    lineHeight: 0.93,
    color: Colors.secondaryLight1000,
  },
  subTitle: {
    color: Colors.secondaryLight900,
    fontWeight: 400,
    lineHeight: 1.42,
  },
  link: {
    textDecoration: 'none',
    color: Colors.chartBlue,
    '&:visited': {
      color: Colors.chartBlue,
    },
  },
  confirmDeletionDialogFlex: {
    display: 'flex',
    flexDirection: 'column',
    gap: 25,
    paddingTop: 25,
    paddingBottom: 10,
  },
  tagsDialogDescription: {
    fontSize: 14,
    fontWeight: 400,
    lineHeight: 1.42,
  },
  alertComponent: {
    borderRadius: 9,
  },
  alertText: {
    fontSize: 13,
    fontWeight: 400,
    lineHeight: 1.23,
    color: Colors.secondaryLight1000,
  },
  docsLink: {
    textDecoration: 'none',
    color: `${Colors.blue} !important`,
  },
  sectionWrapper: {
    display: 'flex',
    gap: 5,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 400,
    lineHeight: 1.33,
    color: Colors.secondaryLight1000,
  },
  horizontalLine: {
    height: 1,
    flex: 1,
    background: Colors.secondaryLight300,
  },
  optionsContainer: {
    display: 'flex',
    gap: 8,
    flexDirection: 'column',
  },
  linkCard: {
    textDecoration: 'none',
  },
  optionWrapper: {
    display: 'flex',
    gap: 15,
    padding: 8,
    borderRadius: 4,
    transition: 'background 100ms',
    '&:hover': {
      backgroundColor: Colors.hoverLightGray,
    },
  },
  optionIcon: {
    width: 100,
    height: 100,
  },
  optionContentWrapper: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  optionTitle: {
    color: Colors.secondaryLight1000,
    fontSize: 13,
    fontWeight: 600,
    lineHeight: 1.15,
  },
  optionDescription: {
    color: Colors.secondaryLight900,
    fontSize: 13,
    fontWeight: 400,
    lineHeight: 1.23,
  },
});

type WidgetCreationDrawerProps = {
  openState: {
    value: DrawerState;
    setter: (d: DrawerState) => void;
  };
  isViewer?: boolean | null;
};
type WidgetOption = {
  icon: string;
  title: string;
  description: string;
  url: string;
  group: 'llm-evaluation' | 'visualization';
};
export const WidgetCreationDrawer = ({ openState, isViewer }: WidgetCreationDrawerProps): ReactElement => {
  const { classes } = useStyles();
  const { dashboardId } = useDashboardIdLayoutContext();
  const flags = useFlags();
  const { getNavUrl } = useNavLinkHandler();
  const {
    value: { widgetIndex },
  } = openState;

  const widgets: WidgetOption[] = [
    {
      title: 'Individual metric comparison',
      description:
        'Select multiple LLM metrics for evaluating performance across model versions. An example might be to evaluate the likelihood ' +
        'of misuse and truthfulness in responses, by looking at the 99th percentile and mean metric values between model versions.',
      group: 'llm-evaluation',
      url: getNavUrl({
        page: 'dashboards',
        dashboards: { dashboardId, graphId: AppRoutePaths.newWidget },
        setParams: [
          { name: 'widgetType', value: 'metricComparison' },
          { name: 'newWidgetIndex', value: widgetIndex.toString() },
        ],
      }),
      icon: metricComparisonIcon,
    },
    {
      title: 'Data comparison',
      description:
        'Select a single LLM metric to evaluate across multiple data cohorts. An example might be to evaluate response consistency across different ' +
        'demographic groups between model versions.',
      group: 'llm-evaluation',
      url: getNavUrl({
        page: 'dashboards',
        dashboards: { dashboardId, graphId: AppRoutePaths.newWidget },
        setParams: [
          { name: 'widgetType', value: 'dataComparison' },
          { name: 'newWidgetIndex', value: widgetIndex.toString() },
        ],
      }),
      icon: dataComparisonIcon,
    },
    {
      title: 'Time series',
      description:
        'Create graphs to visualize multiple batch metrics, from any resource, across any segment. An example might be comparing performance of different models, across  segments such as geo or device type.',
      group: 'visualization',
      url: getNavUrl({
        page: 'dashboards',
        dashboards: { dashboardId, graphId: AppRoutePaths.newWidget },
        setParams: [
          { name: 'widgetType', value: 'timeseries' },
          { name: 'newWidgetIndex', value: widgetIndex.toString() },
        ],
      }),
      icon: timeseriesIcon,
    },
    {
      title: 'Pie chart',
      description:
        'Create pie charts to visualize aggregate counts of frequent items for discrete features. The pie chart will roll up data for the date range set for the dashboard.',
      group: 'visualization',
      url: getNavUrl({
        page: 'dashboards',
        dashboards: { dashboardId, graphId: AppRoutePaths.newWidget },
        setParams: [
          { name: 'widgetType', value: 'pie' },
          { name: 'newWidgetIndex', value: widgetIndex.toString() },
        ],
      }),
      icon: pieChartIcon,
    },
  ];

  const renderSectionTitle = (title: string) => {
    return (
      <div className={classes.sectionWrapper}>
        <WhyLabsText className={classes.sectionTitle}>{title}</WhyLabsText>
        <div className={classes.horizontalLine} />
      </div>
    );
  };

  const renderWidgetOption = (option: WidgetOption) => {
    const content = (
      <div className={classes.optionWrapper}>
        <img src={option.icon} alt={option.title} className={classes.optionIcon} />
        <div className={classes.optionContentWrapper}>
          <WhyLabsText className={classes.optionTitle}>{option.title}</WhyLabsText>
          <WhyLabsText className={classes.optionDescription}>{option.description}</WhyLabsText>
        </div>
      </div>
    );
    return (
      <WhyLabsTooltip
        label={isViewer ? needPermissionToCreateWidgetsTooltip : 'Click to set up this widget'}
        openDelay={1000}
      >
        {isViewer ? (
          content
        ) : (
          <Link to={option.url} className={classes.linkCard}>
            {content}
          </Link>
        )}
      </WhyLabsTooltip>
    );
  };

  return (
    <WhyLabsDrawer
      uniqueId="new-dash-widget-drawer"
      size="max(30%, 500px)"
      minWidth={500}
      isOpen={openState.value.open}
      onClose={() => openState.setter({ open: false, widgetIndex: 0 })}
      classNames={{ body: classes.drawerBody, header: classes.drawerHeader }}
      withOverlay={false}
      title={<WhyLabsText className={classes.drawerTitle}>Add dashboard widget</WhyLabsText>}
    >
      <div className={classes.root}>
        <div className={classes.content}>
          {flags.customDashComparisonWidgets && (
            <>
              {renderSectionTitle('LLM evaluation')}
              <WhyLabsAlert
                dismissible
                icon={<IconInfoCircle color={Colors.yellowWarning} />}
                backgroundColor={Colors.lightRed}
                title={
                  <WhyLabsText className={classes.alertText}>
                    Evaluations require LLMs with segmented reference profiles and/or segmented batch profiles. Refer to{' '}
                    <ExternalLink to="referenceProfilesDocumentationUrl" className={classes.docsLink}>
                      docs
                    </ExternalLink>{' '}
                    for details.
                  </WhyLabsText>
                }
                className={classes.alertComponent}
              />
              <div className={classes.optionsContainer}>
                {widgets.flatMap((w) => {
                  if (w.group !== 'llm-evaluation') return [];
                  return [renderWidgetOption(w)];
                })}
              </div>
            </>
          )}

          {renderSectionTitle('Visualization')}
          <div className={classes.optionsContainer}>
            {widgets.flatMap((w) => {
              if (w.group !== 'visualization') return [];
              return [renderWidgetOption(w)];
            })}
          </div>
        </div>
      </div>
    </WhyLabsDrawer>
  );
};

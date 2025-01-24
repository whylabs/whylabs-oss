import { SinglePageLayout } from '~/components/layout/SinglePageLayout';
import { useFlags } from '~/hooks/useFlags';
import { useSetHtmlTitle } from '~/hooks/useSetHtmlTitle';
import { DashboardGraphIdErrorPage } from '~/routes/:orgId/dashboard/:dashboardId/DashboardIdErrorPage';
import { useDashboardIdLayoutContext } from '~/routes/:orgId/dashboard/:dashboardId/layout/DashboardIdLayout';
import { DataEvaluationBuilder } from '~/routes/:orgId/dashboard/components/data-evaluation/DataEvaluationBuilder';
import { AppRoutePaths } from '~/types/AppRoutePaths';
import { dashboardNameForBreadcrumb } from '~/utils/dashboardUtils';
import { TimePeriod } from '~server/graphql/generated/graphql';
import { ReactElement } from 'react';

import { ChartBuilder } from '../../components/custom-dashboard/ChartBuilder';
import { useDashboardsWidgetIdIndexViewModel } from './useDashboardsWidgetIdIndexViewModel';

export const DashboardsWidgetIdIndex = (): ReactElement => {
  const { widget, creationWidgetType, isNewWidget, breadCrumbs, onClosePage, onSaveWidget, dashboardId } =
    useDashboardsWidgetIdIndexViewModel();
  const {
    dashboardsPickerPresets,
    displayName: dashboardName,
    isEmbeddedIntoCustomContext,
    usedOn,
  } = useDashboardIdLayoutContext();
  const flags = useFlags();
  const { orgCrumb, resourceCrumb, myDashboardsListCrumb, myDashboardIdCrumb, myDashboardsChartIdCrumb } = breadCrumbs;
  useSetHtmlTitle(
    `${isNewWidget ? 'Create' : 'Edit'} widget`.concat(dashboardId !== AppRoutePaths.create ? ` | ${dashboardId}` : ''),
  );

  if (!widget && !isNewWidget) {
    return <DashboardGraphIdErrorPage dashboardId={dashboardId} />;
  }

  const commonBreadCrumbs = [
    orgCrumb,
    ...(usedOn?.resourceId ? [resourceCrumb] : []),
    myDashboardsListCrumb,
    { ...myDashboardIdCrumb, title: dashboardNameForBreadcrumb(dashboardName) },
  ];

  const datePickerConfig = {
    timePeriod: TimePeriod.Pt1H,
    visible: true,
    hideDefaultPresetsList: true,
    extraPresetList: dashboardsPickerPresets,
    informativeText: 'Date range changes are applied to all widgets in this dashboard',
  };

  const isChartType = (() => {
    if (creationWidgetType === 'timeseries') return 'timeseries';
    if (creationWidgetType === 'pie') return 'pie';
    return null;
  })();

  if ((widget && 'plots' in widget) || (!widget && isChartType)) {
    return (
      <ChartBuilder initialChartObject={widget} onClose={onClosePage} onSave={onSaveWidget} usedOn={usedOn}>
        {({ chartBuilderElement, handleOnClose }) => (
          <SinglePageLayout
            breadCrumbs={[...commonBreadCrumbs, myDashboardsChartIdCrumb]}
            datePickerConfig={datePickerConfig}
            hideHeader={isEmbeddedIntoCustomContext}
            onClosePage={handleOnClose}
          >
            {chartBuilderElement}
          </SinglePageLayout>
        )}
      </ChartBuilder>
    );
  }

  const dataEvaluationType = (() => {
    if (widget?.type === 'dataComparison' || creationWidgetType === 'dataComparison') return 'dataComparison';
    if (widget?.type === 'metricComparison' || creationWidgetType === 'metricComparison') return 'metricComparison';
    return null;
  })();

  if (dataEvaluationType && flags.customDashComparisonWidgets) {
    return (
      <DataEvaluationBuilder
        onClose={onClosePage}
        initialWidgetObject={widget}
        onSave={onSaveWidget}
        usedOn={usedOn}
        widgetType={dataEvaluationType}
      >
        {({ widgetBuilderElement, handleOnClose }) => (
          <SinglePageLayout
            breadCrumbs={[...commonBreadCrumbs, { title: 'Comparison table' }]}
            datePickerConfig={datePickerConfig}
            hideHeader={isEmbeddedIntoCustomContext}
            onClosePage={handleOnClose}
          >
            {widgetBuilderElement}
          </SinglePageLayout>
        )}
      </DataEvaluationBuilder>
    );
  }
  return <>Unknown widget</>;
};

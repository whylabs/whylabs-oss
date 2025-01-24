import { createStyles, getStylesRef } from '@mantine/core';
import { IconArrowDown, IconArrowUp, IconChartCandle, IconCopy, IconPlus, IconTrash } from '@tabler/icons-react';
import { Colors } from '~/assets/Colors';
import { ChartCard } from '~/components/chart/ChartCard';
import {
  ConfirmLosingChangesDialog,
  SkeletonGroup,
  WhyLabsActionIcon,
  WhyLabsButton,
  WhyLabsConfirmationDialog,
  WhyLabsText,
} from '~/components/design-system';
import { SinglePageLayout } from '~/components/layout/SinglePageLayout';
import { useFlags } from '~/hooks/useFlags';
import { useSetHtmlTitle } from '~/hooks/useSetHtmlTitle';
import { useNavLinkHandler } from '~/hooks/useWhylabsNavigation';
import { WidgetCreationButtons } from '~/routes/:orgId/dashboard/:dashboardId/components/WidgetCreationButtons';
import { WidgetCreationDrawer } from '~/routes/:orgId/dashboard/:dashboardId/components/WidgetCreationDrawer';
import {
  DashboardWidgetObject,
  DataEvaluationBuilderObject,
} from '~/routes/:orgId/dashboard/components/custom-dashboard/types';
import { DataEvaluationCard } from '~/routes/:orgId/dashboard/components/data-evaluation/DataEvaluationCard';
import { AppRoutePaths } from '~/types/AppRoutePaths';
import { dashboardNameForBreadcrumb } from '~/utils/dashboardUtils';
import { TimePeriod } from '~server/graphql/generated/graphql';
import { Fragment, useState } from 'react';
import { Link } from 'react-router-dom';

import { ChartPreview } from '../components/custom-dashboard/ChartPreview';
import { CustomDashboardHeaderControls } from './components/CustomDashboardHeaderControls';
import { EmptyStateGraphPanel } from './components/EmptyStateGraphPanel';
import { useDashboardIdLayoutContext } from './layout/DashboardIdLayout';
import { useDashboardIdViewModel } from './useDashboardIdViewModel';

const useStyles = createStyles((_, { allowAddWidgetsBetweenCards }: { allowAddWidgetsBetweenCards: boolean }) => ({
  confirmDeletionDialogFlex: {
    display: 'flex',
    flexDirection: 'column',
    gap: 15,
    paddingTop: 15,
  },
  root: {
    background: Colors.brandSecondary100,
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
  },
  header: {
    alignItems: 'center',
    background: Colors.white,
    display: 'flex',
    justifyContent: 'space-between',
    height: '45px',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  main: {
    width: '100%',
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: allowAddWidgetsBetweenCards ? 0 : 15,
    padding: '13px 15px',
    flex: 1,
  },
  createGraphButton: {
    border: `1px solid ${Colors.secondaryLight700}`,
    color: Colors.secondaryLight1000,
    fontSize: 13,
    fontWeight: 600,
  },
  chartCard: {
    [`&:hover .${getStylesRef('actionButtons')}`]: {
      opacity: 1,
    },
    '&:hover': {
      border: `2px solid ${Colors.darkHeader}`,
      boxShadow: '0px 4px 10px 0px rgba(0, 0, 0, 0.15)',
    },
  },
  noMarginBottom: {
    marginBottom: 0,
  },
  actionButtonsContainer: {
    display: 'flex',
    flexDirection: 'row',
    gap: 5,
    opacity: 0,
    ref: getStylesRef('actionButtons'),
    transition: 'opacity 0.3s',
  },
  addGraphSection: {
    display: 'flex',
    position: 'relative',
    height: 15,
    width: '100%',
    padding: '0 16px',
    opacity: 0,
    transition: 'opacity 75ms ease-in-out',
    alignItems: 'center',
    '&:hover': {
      opacity: 1,
      [`& .${getStylesRef('addWidgetAbsoluteButton')}`]: {
        opacity: 1,
      },
    },
  },
  addGraphLine: {
    height: 1,
    background: Colors.secondaryLight500,
    flex: 1,
  },
  addWidgetAbsoluteButton: {
    position: 'absolute',
    left: 0,
    right: 0,
    marginLeft: 'auto',
    marginRight: 'auto',
    opacity: 0,
    ref: getStylesRef('addWidgetAbsoluteButton'),
    transition: 'opacity 200ms ease-in-out 300ms',
    boxShadow: '0px 2px 5px 0px rgba(0, 0, 0, 0.15)',
    fontWeight: 'normal',
    padding: '0px 9px 0px 9px',
    color: Colors.secondaryLight1000,
  },
}));

export const DashboardIdIndex = () => {
  const flags = useFlags();
  const { classes, cx } = useStyles({ allowAddWidgetsBetweenCards: flags.customDashComparisonWidgets });
  const {
    onClosePage,
    isEmbeddedIntoCustomContext,
    breadCrumbs: { orgCrumb, resourceCrumb, myDashboardsListCrumb, myDashboardIdCrumb },
  } = useDashboardIdViewModel();
  const {
    changeGraphPosition,
    dashboardWidgets,
    dashboardId,
    displayName,
    hasUnsavedChanges,
    isDemoOrg,
    membershipRole,
    onCloneWidget,
    onDeleteWidget,
    onSaveWidget,
    dashboardsPickerPresets,
    usedOn,
    createWidgetDrawerState,
  } = useDashboardIdLayoutContext();
  const title = dashboardId === AppRoutePaths.create ? 'New dashboard' : dashboardId;
  useSetHtmlTitle(title);
  const [confirmLosingEditedData, setConfirmLosingEditedData] = useState(false);
  const [confirmWidgetDeletion, setConfirmWidgetDeletion] = useState<{ id: string; displayName: string } | null>(null);

  const isViewer = membershipRole?.isViewer && !isDemoOrg;
  const { getNavUrl } = useNavLinkHandler();
  const commonActionIconProps = {
    size: 30,
  };

  const commonIconProps = {
    size: 15,
  };

  const loadingPermissions = !membershipRole || isDemoOrg === null;

  const handleOnClose = () => {
    if (hasUnsavedChanges) {
      setConfirmLosingEditedData(true);
      return;
    }
    onClosePage();
  };

  const isDataEvaluationWidget = (widget: DashboardWidgetObject): widget is DataEvaluationBuilderObject =>
    widget.type === 'metricComparison' || widget.type === 'dataComparison';

  const displayWidgetPreview = (widget: DashboardWidgetObject) => {
    if (widget.type === 'timeseries' || widget.type === 'pie') {
      return <ChartPreview chart={widget} id={widget.id} />;
    }
    if (isDataEvaluationWidget(widget)) {
      return (
        <DataEvaluationCard
          widgetType={widget.type}
          initialWidgetObject={widget}
          onSave={onSaveWidget}
          usedOn={usedOn}
        />
      );
    }
    return null;
  };

  const pageContent = (
    <div className={classes.root}>
      <div className={classes.header}>
        <CustomDashboardHeaderControls />
      </div>
      <div className={classes.main}>
        {dashboardWidgets.length ? (
          <>
            {dashboardWidgets.map((widget, index) => (
              <Fragment key={widget.id}>
                <ChartCard
                  classNames={{
                    root: classes.chartCard,
                    titleContainer: cx({ [classes.noMarginBottom]: isDataEvaluationWidget(widget) }),
                  }}
                  title={widget.displayName}
                  titleRightChildren={
                    loadingPermissions ? (
                      <SkeletonGroup count={1} width={140} height={20} />
                    ) : (
                      !isViewer && (
                        <div className={classes.actionButtonsContainer}>
                          {index > 0 && (
                            <WhyLabsActionIcon
                              {...commonActionIconProps}
                              onClick={() => changeGraphPosition(index, 'up')}
                              label="Move widget up"
                              labelAsTooltip
                            >
                              <IconArrowUp {...commonIconProps} />
                            </WhyLabsActionIcon>
                          )}
                          {index < dashboardWidgets.length - 1 && (
                            <WhyLabsActionIcon
                              {...commonActionIconProps}
                              onClick={() => changeGraphPosition(index, 'down')}
                              label="Move widget down"
                              labelAsTooltip
                            >
                              <IconArrowDown {...commonIconProps} />
                            </WhyLabsActionIcon>
                          )}
                          <Link to={getNavUrl({ page: 'dashboards', dashboards: { dashboardId, graphId: widget.id } })}>
                            <WhyLabsActionIcon {...commonActionIconProps} label="Edit widget" labelAsTooltip>
                              <IconChartCandle {...commonIconProps} />
                            </WhyLabsActionIcon>
                          </Link>
                          <WhyLabsActionIcon
                            {...commonActionIconProps}
                            label="Clone widget"
                            labelAsTooltip
                            onClick={onCloneWidget(widget, index + 1)}
                          >
                            <IconCopy {...commonIconProps} />
                          </WhyLabsActionIcon>
                          <WhyLabsActionIcon
                            {...commonActionIconProps}
                            label="Delete widget"
                            labelAsTooltip
                            onClick={() => setConfirmWidgetDeletion({ id: widget.id, displayName: widget.displayName })}
                          >
                            <IconTrash {...commonIconProps} />
                          </WhyLabsActionIcon>
                        </div>
                      )
                    )
                  }
                >
                  {displayWidgetPreview(widget)}
                </ChartCard>
                <div className={classes.addGraphSection}>
                  <div className={classes.addGraphLine} />
                  <WhyLabsButton
                    className={classes.addWidgetAbsoluteButton}
                    variant="filled"
                    size="xs"
                    leftIcon={<IconPlus color={Colors.secondaryLight1000} size={18} />}
                    color="gray"
                    onClick={() => createWidgetDrawerState.setter({ open: true, widgetIndex: index + 1 })}
                  >
                    Add widget
                  </WhyLabsButton>
                </div>
              </Fragment>
            ))}
            {!flags.customDashComparisonWidgets && (
              <WidgetCreationButtons isViewer={membershipRole ? isViewer : null} />
            )}
          </>
        ) : (
          <EmptyStateGraphPanel
            isViewer={membershipRole ? isViewer : null}
            openWidgetCreation={() => createWidgetDrawerState.setter({ open: true, widgetIndex: 0 })}
          />
        )}
      </div>
      <WhyLabsConfirmationDialog
        isOpen={!!confirmWidgetDeletion}
        dialogTitle={`Delete widget "${confirmWidgetDeletion?.displayName.trim() ?? ''}"?`}
        closeButtonText="Cancel"
        confirmButtonText="Confirm"
        onClose={() => setConfirmWidgetDeletion(null)}
        onConfirm={() => {
          if (!confirmWidgetDeletion) return;
          onDeleteWidget(confirmWidgetDeletion.id);
          setConfirmWidgetDeletion(null);
        }}
        modalSize="500px"
      >
        <div className={classes.confirmDeletionDialogFlex}>
          <WhyLabsText>You will delete the widget from the dashboard for all users.</WhyLabsText>
          <WhyLabsText>Do you want to continue?</WhyLabsText>
        </div>
      </WhyLabsConfirmationDialog>
      {flags.customDashComparisonWidgets && (
        <WidgetCreationDrawer isViewer={membershipRole ? isViewer : null} openState={createWidgetDrawerState} />
      )}
    </div>
  );

  return (
    <>
      <SinglePageLayout
        breadCrumbs={[
          orgCrumb,
          ...(usedOn?.resourceId ? [resourceCrumb] : []),
          myDashboardsListCrumb,
          { title: dashboardNameForBreadcrumb(displayName) || myDashboardIdCrumb.title },
        ]}
        datePickerConfig={{
          timePeriod: TimePeriod.Pt1H,
          visible: true,
          hideDefaultPresetsList: true,
          extraPresetList: dashboardsPickerPresets,
        }}
        onClosePage={handleOnClose}
        hideHeader={isEmbeddedIntoCustomContext}
      >
        {pageContent}
      </SinglePageLayout>
      <ConfirmLosingChangesDialog
        isOpen={confirmLosingEditedData}
        onCancel={() => setConfirmLosingEditedData(false)}
        onConfirm={onClosePage}
      />
    </>
  );
};

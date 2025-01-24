import { createStyles } from '@mantine/core';
import { SuspenseAwait } from '~/components/await/SuspenseAwait';
import { SelectCustomItems, SkeletonGroup } from '~/components/design-system';
import { SinglePageLayout } from '~/components/layout/SinglePageLayout';
import { useSetHtmlTitle } from '~/hooks/useSetHtmlTitle';
import { AggregatedGraphsContainer } from '~/routes/:orgId/:resourceId/segment-analysis/components/AggregatedGraphsContainer';
import { HeaderControls } from '~/routes/:orgId/:resourceId/segment-analysis/components/HeaderControls';
import { OverallTimeseriesRow } from '~/routes/:orgId/:resourceId/segment-analysis/components/OverallTimeseriesRow';
import { useResourceSegmentAnalysisViewModel } from '~/routes/:orgId/:resourceId/segment-analysis/useResourceSegmentAnalysisViewModel';
import { filterCompatibleMetrics } from '~/routes/:orgId/:resourceId/segment-analysis/utils';
import { parseModelType } from '~/types/resourceTypes';
import { forceRedirectToOrigin } from '~/utils/oldStackUtils';
import { ReactElement } from 'react';

const useStyles = createStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  cardsWrapper: {
    display: 'flex',
    flexDirection: 'column',
    padding: 20,
    width: '100%',
    gap: 20,
  },
});

export const ResourceSegmentAnalysisIndex = (): ReactElement => {
  const { classes } = useStyles();
  const viewModel = useResourceSegmentAnalysisViewModel();
  const { isEmbedded } = viewModel;
  useSetHtmlTitle('Segment analysis');
  const loadingSkeleton = (() => {
    return (
      <>
        {!isEmbedded && <SkeletonGroup count={1} height={92} width="100%" />}
        <div className={classes.cardsWrapper}>
          <SkeletonGroup count={1} mb={20} width="100%" height={280} />
          <SkeletonGroup count={1} width="100%" height={40} />
          <SkeletonGroup count={3} mt={2} width="100%" height={280} />
        </div>
      </>
    );
  })();

  const pageContent = (
    <div className={classes.root}>
      <SuspenseAwait resolve={viewModel.asyncData} fallback={loadingSkeleton}>
        {([metricsData, resourceData]) => {
          const compatibleMetrics = filterCompatibleMetrics(metricsData);
          const { modelType } = resourceData ?? {};
          const resourceType = modelType ? parseModelType(modelType) : null;
          const { primaryMetric, secondaryMetric, referenceThreshold, targetColumn } = viewModel.getHeaderControlsState(
            resourceType,
            compatibleMetrics,
          );
          const usedTargetColumn =
            viewModel.meta.columns.columnsList?.find(({ name }) => name === targetColumn)?.name ?? null;
          const usedPrimaryMetric = compatibleMetrics.find((m) => m.label === primaryMetric) ?? null;
          const usedSecondaryMetric = compatibleMetrics.find((m) => m.label === secondaryMetric) ?? null;
          const commonProps = {
            pageViewModel: viewModel,
            primaryMetric: usedPrimaryMetric,
            secondaryMetric: usedSecondaryMetric,
            referenceThreshold,
            targetColumn: usedTargetColumn,
          };
          return (
            <>
              {!isEmbedded && (
                <HeaderControls {...commonProps} metricsData={compatibleMetrics} resourceType={resourceType} />
              )}
              <div className={classes.cardsWrapper}>
                <OverallTimeseriesRow {...commonProps} resourceData={resourceData} />
                <AggregatedGraphsContainer {...commonProps} />
              </div>
            </>
          );
        }}
      </SuspenseAwait>
    </div>
  );
  const { orgCrumb, resourceCrumb, tracingCrumb } = viewModel.breadcrumbs;

  return (
    <SinglePageLayout
      hideHeader={isEmbedded}
      headerFields={[
        {
          data: viewModel.resources.data,
          itemComponent: SelectCustomItems.GenericFlexColumnItem,
          label: 'Resource',
          loading: viewModel.resources.isLoading,
          value: viewModel.meta.resourceId,
          onChange: viewModel.onChangeResource,
          type: 'select',
        },
      ]}
      onClosePage={forceRedirectToOrigin}
      breadCrumbs={[orgCrumb, resourceCrumb, tracingCrumb]}
      datePickerConfig={{
        visible: true,
        timePeriod: viewModel.meta.batchFrequency,
        loading: viewModel.meta.loadingBatchFrequency,
      }}
    >
      {pageContent}
    </SinglePageLayout>
  );
};

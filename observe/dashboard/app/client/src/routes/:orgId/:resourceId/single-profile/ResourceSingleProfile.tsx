import { IconDownload, IconExclamationCircle } from '@tabler/icons-react';
import { Colors } from '~/assets/Colors';
import { LineProps } from '~/components/chart/chartTypes';
import { ScatterPlotChart } from '~/components/chart/ScatterPlotChart';
import { WhyLabsActionIcon, WhyLabsAlert, WhyLabsCard, WhyLabsTooltip } from '~/components/design-system';
import { SimpleEmptyStateMessage } from '~/components/empty-state/SimpleEmptyStateMessage';
import { SinglePageLayout } from '~/components/layout/SinglePageLayout';
import { useSetHtmlTitle } from '~/hooks/useSetHtmlTitle';
import { JSX } from 'react';

import { ResourceSingleProfileControls } from './ResourceSingleProfileControls';
import { ResourceSingleProfileTable } from './ResourceSingleProfileTable';
import { OUTSIDE_THE_THRESHOLD_STATUS, useResourceSingleProfileViewModel } from './ResourceSingleProfileViewModel';
import { useResourceSingleProfileStyles } from './useResourceSingleProfileStyles';

export const ResourceSingleProfile = (): JSX.Element => {
  const { classes } = useResourceSingleProfileStyles();
  useSetHtmlTitle('Time series');
  const viewModel = useResourceSingleProfileViewModel();
  const { selectedMetric } = viewModel;

  return (
    <SinglePageLayout
      classNames={{ main: classes.main }}
      headerFields={[
        {
          data: viewModel.resourcesData,
          label: 'Resource',
          value: viewModel.selectedResourceId,
          onChange: viewModel.onChangeResource,
          type: 'select',
        },
        {
          clearable: true,
          data: viewModel.segmentsData,
          label: 'Segment',
          value: viewModel.rawSelectedSegment,
          onChange: viewModel.onChangeSegment,
          type: 'select',
        },
      ]}
      onClosePage={viewModel.onClosePage}
    >
      <>
        <ResourceSingleProfileControls />
        {viewModel.shouldRenderChart ? (
          <section className={classes.contentSection}>
            {viewModel.chart.isTruncated && (
              <WhyLabsAlert backgroundColor={Colors.white} className={classes.isTruncatedAlert}>
                <div className={classes.isTruncatedMessage}>
                  <IconExclamationCircle color={Colors.chartBlue} size={14} />
                  Data for this range exceeds the chart maximum: up to 1,000 data points can be visualized. Modify the
                  range to display less than 1,000 values.
                </div>
              </WhyLabsAlert>
            )}
            <WhyLabsCard>
              <div className={classes.cardHeader}>
                <h2 className={classes.chartTitle}>{viewModel.selectedColumn}</h2>
                {renderDownloadToCsvButton()}
              </div>
              {renderChart()}
            </WhyLabsCard>
          </section>
        ) : (
          <SimpleEmptyStateMessage title="Select a column and metric" />
        )}

        {!!viewModel.selectedMetric && (
          <section className={classes.tableSection}>
            <ResourceSingleProfileTable metricName={viewModel.selectedMetric.label} />
          </section>
        )}
      </>
    </SinglePageLayout>
  );

  function renderChart() {
    // Should not happen since we are checking for selectedMetric in viewModel.shouldRenderChart
    if (!selectedMetric) return null;

    const { chart, referenceProfile, endTimestamp, startTimestamp } = viewModel;
    const referenceProfileValue = referenceProfile.metricValue;

    const { minValue, maxValue, ...chartData } = chart;

    const minTimestamp = startTimestamp;
    const maxTimestamp = endTimestamp;
    const hasXDomain = minTimestamp > 0 && maxTimestamp > minTimestamp;

    const referenceProfileLine: LineProps = {
      color: Colors.chartAqua,
      id: 'reference-profile-line',
      strokeWidth: 2,
      values: referenceProfileValue ? [referenceProfileValue] : [],
    };

    const yDomainMax = referenceProfileValue ? Math.max(maxValue, referenceProfileValue) : maxValue;
    const yDomainMin = referenceProfileValue ? Math.min(minValue, referenceProfileValue) : minValue;

    return (
      <ScatterPlotChart
        height={340}
        {...chartData}
        color={(status) => {
          if (status === OUTSIDE_THE_THRESHOLD_STATUS) return Colors.red;

          return Colors.chartPrimary;
        }}
        customLines={[referenceProfileLine]}
        description="Displays single profile data"
        onSelectItems={viewModel.onSelectChartItems}
        selectedIds={viewModel.selectedIds}
        spec={{
          xAxis: hasXDomain ? { min: minTimestamp, max: maxTimestamp } : undefined,
          yAxis: [
            {
              title: selectedMetric.label,
              max: yDomainMax,
              min: yDomainMin,
            },
          ],
        }}
      />
    );
  }

  function renderDownloadToCsvButton() {
    const { isLoading, onClick, shouldRender } = viewModel.downloadCsv;
    if (!shouldRender) return null;

    const iconButton = (
      <WhyLabsActionIcon
        className={classes.downloadButton}
        label="Download to CSV"
        loading={isLoading}
        onClick={onClick}
        size="md"
      >
        <IconDownload size={18} />
      </WhyLabsActionIcon>
    );

    if (isLoading) {
      return (
        <div className={classes.preparingDownloadState}>
          Preparing download
          {iconButton}
        </div>
      );
    }

    return <WhyLabsTooltip label="Download to CSV">{iconButton}</WhyLabsTooltip>;
  }
};

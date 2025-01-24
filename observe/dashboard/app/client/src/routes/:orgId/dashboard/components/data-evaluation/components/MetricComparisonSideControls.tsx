import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import { WhyLabsButton, WhyLabsText } from '~/components/design-system';
import { useSegmentFilter } from '~/hooks/useSegmentFilter';
import { segmentStringToTags, segmentTagsToString } from '~/utils/segments';
import { OVERALL_SEGMENT_KEY_VALUE } from '~server/trpc/dashboard/types/data-evalutation-types';
import React, { ReactElement, useState } from 'react';

import { DataEvaluationBuilderChild } from '../useDataEvaluationBuilderViewModel';
import { RowsManagerModal } from './modal/RowsManagerModal';
import { SideControls, SideControlsProps } from './SideControls';
import { useEvaluationCommonStyles } from './utils';

export type DataComparisonSideControlsProps = DataEvaluationBuilderChild;

const useStyles = createStyles({
  rowsDefinitionText: {
    color: Colors.secondaryLight1000,
    fontSize: 14,
    fontWeight: 400,
    lineHeight: 1.42,
  },
});
export const MetricComparisonSideControls = ({ parentViewModel }: DataComparisonSideControlsProps): ReactElement => {
  const { classes, cx } = useStyles();
  const { classes: commonStyles } = useEvaluationCommonStyles();
  const { tempControlsState, tempControlsErrorState, loading, queryParams } = parentViewModel;
  const [rowsDefinitionModal, setRowsDefinitionModal] = useState(false);

  const { renderFilter: renderSegmentFilter } = useSegmentFilter({
    onChange: (tags) => {
      parentViewModel.onChangeRowSegmentGrouping(segmentTagsToString(tags, OVERALL_SEGMENT_KEY_VALUE));
    },
    resourceId: tempControlsState?.resourceId ?? '',
    selectedSegment: segmentStringToTags(tempControlsState?.tableRowsDefinition?.rowSegmentGroup?.[0] ?? ''),
    singleSegmentSelector: true,
  });

  const hasDataSourceError =
    tempControlsErrorState.value.has('metrics') || tempControlsErrorState.value.has('resourceColumns');

  const rowsDefined = () => {
    let datasetMetricRowsCount = 0;
    const selectedColumnMetrics =
      tempControlsState?.dataSource?.metrics?.filter((m) => {
        const isColumnMetric = !m.column;
        if (isColumnMetric) return true;
        // datasetMetrics results in a single row.
        datasetMetricRowsCount += 1;
        return false;
      }) ?? [];
    const columnMetricRowsCount =
      selectedColumnMetrics.length * (tempControlsState?.dataSource?.resourceColumns ?? []).length;
    return datasetMetricRowsCount + columnMetricRowsCount;
  };

  const getAddRowsButtonLabel = () => {
    const hasRowsDefined = rowsDefined();
    if (!!queryParams?.resourceId && queryParams.resourceId === tempControlsState.resourceId && !!hasRowsDefined)
      return 'Select additional metrics';
    return 'Select metrics';
  };

  const queryDefinitionControls: SideControlsProps['queryDefinitionControls'] = [
    {
      children: parentViewModel.commonSelectComponents.groupByColumnsSelector,
    },
    {
      children: (
        <div className={commonStyles.flexSection}>
          {renderSegmentFilter({
            hideIcon: true,
            label: (
              <WhyLabsText size={14}>
                Segment <span style={{ fontSize: 12, fontWeight: 400 }}>(optional)</span>:
              </WhyLabsText>
            ),
            placeholder: 'Target a segment for comparison',
          })}
        </div>
      ),
    },
    {
      children: (
        <div className={commonStyles.sectionWrapper}>
          {hasDataSourceError && <div className={commonStyles.errorIndicator} />}
          <div className={commonStyles.flexSection}>
            <WhyLabsText className={commonStyles.sectionLabel}>Rows:</WhyLabsText>
            <WhyLabsText className={classes.rowsDefinitionText}>
              {rowsDefined() || 'No'} {rowsDefined() === 1 ? 'row' : 'rows'} added to the table
            </WhyLabsText>
            <WhyLabsButton
              variant="filled"
              color="gray"
              disabled={!tempControlsState.resourceId}
              onClick={() => setRowsDefinitionModal(true)}
              loading={loading.metrics}
              width="full"
              className={cx(commonStyles.sideControlButton, commonStyles.lightDisabledButton)}
              disabledTooltip="Select a resource to view metrics"
            >
              {getAddRowsButtonLabel()}
            </WhyLabsButton>
            {hasDataSourceError && (
              <WhyLabsText className={commonStyles.errorMessage}>Please select metrics</WhyLabsText>
            )}
          </div>
        </div>
      ),
    },
  ];

  return (
    <>
      <SideControls
        title="Data controls for rows"
        queryDefinitionControls={queryDefinitionControls}
        bottomButton={{
          onClick: parentViewModel.onApplyParamsChanges,
        }}
        parentViewModel={parentViewModel}
      />
      <RowsManagerModal
        isOpen={rowsDefinitionModal}
        onClose={() => setRowsDefinitionModal(false)}
        parentViewModel={parentViewModel}
      />
    </>
  );
};

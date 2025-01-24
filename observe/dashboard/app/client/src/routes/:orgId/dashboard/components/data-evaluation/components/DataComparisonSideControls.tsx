import { WhyLabsSelect, WhyLabsText } from '~/components/design-system';
import { metricObjectToSelectFormat } from '~/routes/:orgId/dashboard/components/data-evaluation/utils';
import { EvaluationAggregationType } from '~server/trpc/dashboard/types/data-evalutation-types';
import React, { ReactElement } from 'react';

import { DataEvaluationBuilderChild } from '../useDataEvaluationBuilderViewModel';
import { SideControls, SideControlsProps } from './SideControls';
import { useEvaluationCommonStyles } from './utils';

export type DataComparisonSideControlsProps = DataEvaluationBuilderChild;

export const DataComparisonSideControls = ({ parentViewModel }: DataComparisonSideControlsProps): ReactElement => {
  const { classes } = useEvaluationCommonStyles();
  const { tempControlsErrorState, tempControlsState, profileMetrics } = parentViewModel;
  const isReferenceProfileComparison = tempControlsState.type === EvaluationAggregationType.ReferenceProfile;
  const hasDataSourceError =
    tempControlsErrorState.value.has('metrics') || tempControlsErrorState.value.has('resourceColumns');

  const selectedMetric = tempControlsState.dataSource?.metrics?.[0];

  const getMetricSelectValue = () => {
    if (!selectedMetric) return null;
    return metricObjectToSelectFormat(selectedMetric);
  };

  const queryDefinitionControls: SideControlsProps['queryDefinitionControls'] = [
    ...(isReferenceProfileComparison
      ? [
          {
            children: parentViewModel.commonSelectComponents.groupByColumnsSelector,
          },
        ]
      : []),
    {
      children: (
        <div className={classes.sectionWrapper}>
          {hasDataSourceError && <div className={classes.errorIndicator} />}
          <div className={classes.flexSection}>
            <WhyLabsSelect
              label="Metric:"
              data={profileMetrics?.selectData ?? []}
              loading={profileMetrics.loading}
              maxDropdownHeight={400}
              nothingFound={!tempControlsState.resourceId ? 'Select a resource to view metrics' : undefined}
              value={getMetricSelectValue()}
              onChange={(value) => parentViewModel.onChangeMetrics(value ? [value] : [])}
              error={tempControlsErrorState.value.has('metrics')}
            />
            <WhyLabsSelect
              label="column"
              hideLabel
              placeholder={selectedMetric?.column ? 'Not applicable' : 'Select target column'}
              maxDropdownHeight={400}
              data={selectedMetric?.column ? [] : parentViewModel.resourceColumnsList.columnsSelectData}
              disabled={!!selectedMetric?.column}
              disabledTooltip="Not applicable for the selected metric"
              loading={parentViewModel.resourceColumnsList.isLoading}
              value={selectedMetric?.column ? null : tempControlsState.dataSource?.resourceColumns?.[0] ?? null}
              onChange={(value) => parentViewModel.onChangeResourceColumns(value ? [value] : [])}
              error={tempControlsErrorState.value.has('resourceColumns')}
              nothingFound={!tempControlsState.resourceId ? 'Select a resource to view columns' : undefined}
            />
            {hasDataSourceError && (
              <WhyLabsText className={classes.errorMessage}>Please fill the metric fields</WhyLabsText>
            )}
          </div>
        </div>
      ),
    },
    ...(!isReferenceProfileComparison
      ? [
          {
            children: parentViewModel.commonSelectComponents.groupByColumnsSelector,
          },
        ]
      : []),
    {
      children: (
        <div className={classes.flexSection}>
          <WhyLabsSelect
            label="Group by - rows:"
            maxDropdownHeight={300}
            placeholder="Select a segment key"
            {...parentViewModel.resourceSegmentKeysList}
            onChange={parentViewModel.onChangeRowSegmentGrouping}
            value={tempControlsState.tableRowsDefinition?.rowSegmentGroup?.[0] ?? null}
            nothingFound={!tempControlsState.resourceId ? 'Select a resource to view segments' : undefined}
          />
        </div>
      ),
    },
  ];

  return (
    <SideControls
      title="Data controls"
      queryDefinitionControls={queryDefinitionControls}
      bottomButton={{
        onClick: parentViewModel.onApplyParamsChanges,
      }}
      parentViewModel={parentViewModel}
    />
  );
};

import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';

import { DataEvaluationBuilderChild } from '../useDataEvaluationBuilderViewModel';
import { DataComparisonSideControls } from './DataComparisonSideControls';
import { DataEvaluationPreview } from './DataEvaluationPreview';
import { MetricComparisonSideControls } from './MetricComparisonSideControls';
import { ColumnsManagerModal } from './modal/ColumnsManagerModal';

const useStyles = createStyles((_, { isEditWidgetPage }: { isEditWidgetPage: boolean }) => ({
  root: {
    marginTop: isEditWidgetPage ? 15 : 10,
    display: 'flex',
    gap: 15,
    width: '100%',
    overflow: 'hidden',
  },
  emptyState: {
    height: 580,
    flex: 1,
    display: 'flex',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    background: Colors.brandSecondary100,
    color: Colors.secondaryLight1000,
    fontSize: 16,
    fontWeight: 400,
  },
}));
export const DataEvaluationContent = ({ parentViewModel }: DataEvaluationBuilderChild) => {
  const { displaySideControls, widgetType, queryParams, isEditWidgetPage } = parentViewModel;
  const { classes } = useStyles({ isEditWidgetPage });
  const renderSideControls = () => {
    if (!displaySideControls.value) return null;
    switch (widgetType) {
      case 'dataComparison':
        return <DataComparisonSideControls parentViewModel={parentViewModel} />;
      case 'metricComparison':
        return <MetricComparisonSideControls parentViewModel={parentViewModel} />;
      default:
        return null;
    }
  };

  const emptyState = <div className={classes.emptyState}>No data controls applied</div>;

  const displayContent = () => {
    if (!queryParams) return emptyState;
    switch (widgetType) {
      case 'dataComparison':
      case 'metricComparison':
        return <DataEvaluationPreview parentViewModel={parentViewModel} />;
      default:
        return emptyState;
    }
  };

  return (
    <div className={classes.root}>
      {renderSideControls()}
      {displayContent()}
      <ColumnsManagerModal parentViewModel={parentViewModel} />
    </div>
  );
};

import { IconArrowLeft, IconExclamationCircle } from '@tabler/icons-react';
import { Colors } from '~/assets/Colors';
import { WhyLabsAlert, WhyLabsButton, WhyLabsRadioGroup, WhyLabsText } from '~/components/design-system';
import {
  ItemListSelectionModal,
  ItemListSelectionModalProps,
} from '~/components/design-system/modal/ItemListSelectionModal';
import React, { ReactElement } from 'react';

import { METRIC_SELECTION_LIMIT } from '../../utils';
import { useEvaluationCommonStyles } from '../utils';
import { RowsManagerModalProps, RowsMetricType, useRowsManagerModalViewModal } from './useRowsManagerModalViewModal';

export const RowsManagerModal = ({ parentViewModel, isOpen, onClose }: RowsManagerModalProps): ReactElement | null => {
  const { classes, cx } = useEvaluationCommonStyles();
  const {
    searchState,
    onCloseHandler,
    stage,
    onClickBackPreviousStage,
    selectedSegmentKey,
    getConfirmButtonDisabledState,
    handleConfirmButtonClick,
    isSegmentColumns,
    metricType,
    getItems,
    getItemsClickHandler,
    tempModalSelectionState,
    onChangeMetricType,
    getConfirmButtonState,
    isAdditionalMetricsFlow,
  } = useRowsManagerModalViewModal({
    parentViewModel,
    isOpen,
    onClose,
  });

  const isDatasetMetrics = metricType === RowsMetricType.datasetMetrics;
  const availableCount = () => {
    if (stage === 2) return tempModalSelectionState.columnMetrics.available.size ?? 0;
    if (metricType === RowsMetricType.columnMetrics) return tempModalSelectionState.columns.available.size ?? 0;
    return tempModalSelectionState.datasetMetrics.available.size ?? 0;
  };

  const checkSelectionLimit = () => {
    if (stage === 2)
      return (
        getItems().right.length + tempModalSelectionState.columnMetrics.previouslySelected.size >=
        METRIC_SELECTION_LIMIT
      );
    if (metricType === RowsMetricType.columnMetrics)
      return (
        getItems().right.length + tempModalSelectionState.columns.previouslySelected.size >= METRIC_SELECTION_LIMIT
      );
    return (
      getItems().right.length + tempModalSelectionState.datasetMetrics.previouslySelected.size >= METRIC_SELECTION_LIMIT
    );
  };

  const leftSection: ItemListSelectionModalProps['leftSection'] = {
    title:
      stage === 1
        ? `Select from ${isDatasetMetrics ? 'available metrics' : 'numeric columns'}`
        : `Select from available metric values`,
    listSubTitle:
      stage === 1 ? `Available for selection (${availableCount()}):` : `Available metric values (${availableCount()}):`,
    items: getItems().left,
    handler: getItemsClickHandler().left,
    disabled: checkSelectionLimit(), // temporary until we implement async queries
  };

  const getRightSideEmptyMessage = () => {
    if (stage === 2 && isAdditionalMetricsFlow && !!tempModalSelectionState.columns.selected.size)
      return 'The selected columns will be combined with the previously selected metric values.';
    return undefined;
  };

  const rightSection: ItemListSelectionModalProps['rightSection'] = {
    title:
      stage === 1
        ? `${isDatasetMetrics ? 'Metrics' : 'Target columns'} to be used for row definitions`
        : `Selected metric values to be used for comparison`,
    listSubTitle: stage === 1 ? 'Selected' : 'Selected metric values',
    items: getItems().right,
    locked: [],
    handler: getItemsClickHandler().right,
    allowComprehensiveTargeting: true,
    emptySelectionMessage: getRightSideEmptyMessage(),
  };

  const getModalTitle = (
    <div className={classes.modalTitleWrapper}>
      <WhyLabsText className={classes.modalTitle}>
        {isSegmentColumns ? (
          <>
            Select metrics for <span className={classes.modalBold}>{selectedSegmentKey}</span> comparison
          </>
        ) : (
          <>Select metrics for reference profiles comparison</>
        )}
      </WhyLabsText>
    </div>
  );

  const topComponent = () => {
    if (stage === 1) {
      return (
        <div className={classes.topComponent}>
          <WhyLabsRadioGroup
            label="metric type"
            hideLabel
            spacing={18}
            marginTop={0}
            value={metricType}
            onChange={onChangeMetricType}
            options={[
              { label: 'Select from "target column" metrics', value: RowsMetricType.columnMetrics },
              { label: 'Select from dataset metrics or custom metrics', value: RowsMetricType.datasetMetrics },
            ]}
          />
          <WhyLabsAlert
            backgroundColor={Colors.brandSecondary100}
            className={classes.alert}
            icon={<IconExclamationCircle color={Colors.chartBlue} size={18} />}
          >
            <WhyLabsText className={classes.alert}>
              {metricType === RowsMetricType.columnMetrics
                ? 'In WhyLabs, a profile’s target columns may be called metrics or features (inputs/outputs), depending on the resource. Only columns with numeric data can be selected for comparisons.'
                : 'In WhyLabs, a profile’s dataset metrics include performance metrics (accuracy, precision, etc.) and custom metrics.'}
            </WhyLabsText>
          </WhyLabsAlert>
        </div>
      );
    }
    return (
      <WhyLabsAlert
        backgroundColor={Colors.brandSecondary100}
        className={classes.alert}
        icon={<IconExclamationCircle color={Colors.chartBlue} size={18} />}
      >
        <WhyLabsText className={classes.alert}>
          Selected metric values will be used for each of the target columns that were previously selected.
        </WhyLabsText>
      </WhyLabsAlert>
    );
  };

  const actionsSectionLeftComponent = () => {
    if (stage === 2) {
      return (
        <WhyLabsButton
          variant="filled"
          color="gray"
          onClick={onClickBackPreviousStage}
          className={cx(classes.sideControlButton, classes.leftPositionedButton)}
          disabledTooltip="Select a resource to define rows"
        >
          <div className={classes.flexRow}>
            <IconArrowLeft size={18} color="black" />
            <WhyLabsText className={classes.buttonText}>
              Back to target column selections ({tempModalSelectionState.columns.selected.size})
            </WhyLabsText>
          </div>
        </WhyLabsButton>
      );
    }
    return <></>;
  };

  return (
    <ItemListSelectionModal
      isOpen={isOpen}
      topComponent={topComponent()}
      actionsSectionLeftComponent={actionsSectionLeftComponent()}
      title={getModalTitle}
      onClose={onCloseHandler}
      leftSection={leftSection}
      rightSection={rightSection}
      searchState={searchState}
      cancelButton={{ label: 'Cancel', handler: onCloseHandler }}
      confirmButton={{
        label: getConfirmButtonState().label,
        className: getConfirmButtonState().className,
        handler: handleConfirmButtonClick,
        disabled: getConfirmButtonDisabledState(),
        disabledTooltip: 'Make selection to continue',
      }}
    />
  );
};

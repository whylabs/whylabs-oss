import { Button, createStyles } from '@mantine/core';
import { IconAdjustmentsAlt, IconChartBarPopular, IconColumns3, IconDownload, IconTable } from '@tabler/icons-react';
import { Colors } from '~/assets/Colors';
import {
  WhyLabsActionIcon,
  WhyLabsBadge,
  WhyLabsButton,
  WhyLabsText,
  WhyLabsTooltip,
} from '~/components/design-system';
import { InvisibleButton } from '~/components/misc/InvisibleButton';
import {
  HighlightValuesType,
  MAX_VALUE_BG_COLOR,
  MIN_VALUE_BG_COLOR,
  getSideControlsWidth,
  metricObjectToSelectFormat,
} from '~/routes/:orgId/dashboard/components/data-evaluation/utils';
import { upperCaseFirstLetterOnly } from '~/utils/stringUtils';
import { ProfileMetric } from '~server/graphql/resolvers/types/metrics';
import {
  EvaluationAggregationType,
  EvaluationColumnDefinitionType,
  OVERALL_SEGMENT_KEY_VALUE,
} from '~server/trpc/dashboard/types/data-evalutation-types';
import { ReactElement, useState } from 'react';

import { DashboardDateRangeBadge } from '../../custom-dashboard/utils';
import { DataEvaluationBuilderChild } from '../useDataEvaluationBuilderViewModel';

const useStyles = createStyles((_, { sideControlsWidth }: { sideControlsWidth?: number }) => ({
  root: {
    width: '100%',
    overflow: 'auto',
    flexShrink: 0,
    minHeight: 32,
  },
  flexRow: {
    display: 'flex',
    alignItems: 'center',
  },
  gap5: {
    gap: 5,
  },
  gap10: {
    gap: 10,
  },
  spaceBetween: {
    justifyContent: 'space-between',
  },
  actionButton: {
    height: 30,
    width: 30,
    padding: 0,
    borderRadius: 3,
    border: `1px solid ${Colors.secondaryLight300}`,
    '&:hover': {
      border: `1px solid ${Colors.secondaryLight300}`,
      backgroundColor: Colors.secondaryLight50,
    },
  },
  avoidButtonTransform: {
    '&:active': {
      transform: 'unset',
    },
  },
  selectedButton: {
    '&, &:hover': {
      backgroundColor: Colors.secondaryLight100,
    },
  },
  noBorderLeft: {
    '&, &:hover': {
      borderLeft: 'unset',
    },
  },
  dateRangeLabel: {
    color: 'black',
    fontFamily: 'Inconsolata',
    fontSize: '13px',
    fontStyle: 'normal',
    fontWeight: 600,
    lineHeight: 1.07,
    letterSpacing: '-0.13px',
    marginLeft: 5,
    marginRight: 2,
  },
  badgesFlexContainer: {
    display: 'flex',
    gap: 7,
    alignItems: 'center',
    paddingLeft: 5,
    minWidth: 400,
    maxWidth: `calc(80vw - 300px - ${sideControlsWidth ?? 0}px)`,
    overflow: 'hidden',
    paddingRight: 15,
  },
  badge: {
    color: Colors.secondaryLight1000,
    '& *': {
      fontFamily: 'Inconsolata',
    },
    height: 24,
    borderRadius: '18px',
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: '-0.13px',
    lineHeight: '14px',
  },
  grayBadge: {
    background: Colors.secondaryLight200,
  },
  whiteBadge: {
    background: 'white',
    border: `1px solid ${Colors.secondaryLight700}`,
  },
  aquaBadge: {
    background: Colors.brandPrimary100,
  },
  segmentBadgeWrapper: {},
  highlightCellsLabel: {
    color: Colors.secondaryLight1000,
    fontSize: 14,
    fontWeight: 600,
    flexShrink: 0,
  },
  highlightButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    width: 'fit-content',
    height: 22,
    cursor: 'default',
    '&[type="button"]': {
      cursor: 'pointer',
    },
  },
  rect: {
    borderRadius: 2,
  },
  rectLabel: {
    color: Colors.secondaryLight700,
    fontSize: 14,
    fontWeight: 400,
    lineHeight: 1.55,
  },
  rectActiveLabel: {
    color: Colors.secondaryLight1000,
  },
}));

type PreviewTopControlsProps = {
  highlightState: { value: Set<HighlightValuesType>; onChange: (toggleOption: HighlightValuesType) => void };
  metricsLabelMap: Map<string, ProfileMetric>;
  downloadDataFn: () => void;
} & DataEvaluationBuilderChild;
export const PreviewTopControls = ({
  parentViewModel,
  highlightState,
  metricsLabelMap,
  downloadDataFn,
}: PreviewTopControlsProps): ReactElement => {
  const {
    displaySideControls,
    viewMode,
    displayColumnManagementModalState,
    widgetType,
    queryParams,
    dataControlsPickerTimePeriod,
  } = parentViewModel;
  const sideControlsWidth = getSideControlsWidth(dataControlsPickerTimePeriod);
  const { classes, cx } = useStyles({ sideControlsWidth });
  const { tableColumnsDefinition, tableRowsDefinition, resourceId } = queryParams ?? {};
  const [loadingDownload, setLoadingDownload] = useState(false);
  const isSegmentComparison = tableColumnsDefinition?.type === EvaluationColumnDefinitionType.Segment;
  const isOverallSegment = isSegmentComparison && !tableColumnsDefinition.segmentValues?.length;

  const getColumnManagementTooltip = () => {
    if (isOverallSegment) {
      return 'Columns management is available when grouping columns by segment';
    }
    return 'Manage table columns';
  };
  if (!queryParams) return <></>;

  const batchRangeBadge = () => {
    if (queryParams.type !== EvaluationAggregationType.DateRange) return null;
    return (
      <DashboardDateRangeBadge
        dateRange={queryParams.dateRange}
        rangeBadgeOnly
        displayUTC
        labelClassName={classes.badge}
      />
    );
  };

  const resourceColumnsBadge = () => {
    if (widgetType === 'metricComparison') return null;
    const metricObject = queryParams.dataSource.metrics[0];
    if (!metricObject) return null;
    const metricKey = metricObjectToSelectFormat(metricObject).toLowerCase();
    const metricLabel = metricsLabelMap.get(metricKey)?.label ?? metricObject.metric.toLowerCase() ?? '';
    const columnName = queryParams.dataSource.resourceColumns[0];
    return (
      <WhyLabsBadge className={cx(classes.badge, classes.aquaBadge)} displayTooltip>
        {columnName ? columnName.concat(' ') : ''}
        {columnName ? metricLabel?.toLowerCase() : metricLabel}
      </WhyLabsBadge>
    );
  };

  const filteredSegmentBadge = () => {
    const rowsSegment = tableRowsDefinition?.rowSegmentGroup?.[0] ?? OVERALL_SEGMENT_KEY_VALUE;
    if (widgetType === 'dataComparison') return null;
    return (
      <WhyLabsBadge className={cx(classes.badge, classes.aquaBadge)} displayTooltip>
        {rowsSegment === OVERALL_SEGMENT_KEY_VALUE ? 'All data' : rowsSegment}
      </WhyLabsBadge>
    );
  };

  const countTableColumns = () => {
    if (tableColumnsDefinition?.type === EvaluationColumnDefinitionType.Segment)
      return tableColumnsDefinition?.segmentValues?.length ?? 0;
    if (tableColumnsDefinition?.type === EvaluationColumnDefinitionType.ReferenceProfile)
      return tableColumnsDefinition?.referenceProfileIds?.length ?? 0;
    return 0;
  };

  const renderHighlightOption = (option: HighlightValuesType) => {
    const usedColor = option === 'min' ? MIN_VALUE_BG_COLOR : MAX_VALUE_BG_COLOR;
    const highlighted = highlightState.value.has(option);
    const multipleComparisonColumns = countTableColumns() > 1;
    const tooltipLabel = multipleComparisonColumns
      ? `Click to ${highlighted ? 'stop highlighting' : 'highlight'} the ${option} values between the compared ${
          isSegmentComparison ? 'segments' : 'reference profiles'
        }`
      : `Select another ${isSegmentComparison ? 'segment' : 'reference profile'} to compare metric values`;
    return (
      <WhyLabsTooltip label={tooltipLabel}>
        <InvisibleButton
          className={classes.highlightButton}
          onClick={multipleComparisonColumns ? () => highlightState.onChange(option) : undefined}
        >
          <svg width={14} height={14} className={classes.rect}>
            <rect width={14} height={14} fill={highlighted ? usedColor : Colors.gray} />
          </svg>
          <WhyLabsText className={cx(classes.rectLabel, { [classes.rectActiveLabel]: highlighted })}>
            {upperCaseFirstLetterOnly(option)} values
          </WhyLabsText>
        </InvisibleButton>
      </WhyLabsTooltip>
    );
  };

  return (
    <div className={cx(classes.flexRow, classes.spaceBetween, classes.root)}>
      <div className={cx(classes.flexRow, classes.gap5)}>
        <WhyLabsActionIcon
          tooltip="Toggle data controls"
          label="toggle data controls"
          className={cx(classes.actionButton, { [classes.selectedButton]: displaySideControls.value })}
          onClick={() => displaySideControls.setter((c) => !c)}
        >
          <IconAdjustmentsAlt
            size={16}
            color={displaySideControls.value ? Colors.chartPrimary : Colors.secondaryLight1000}
          />
        </WhyLabsActionIcon>
        <WhyLabsTooltip label="Switch between table and graph view">
          <Button.Group>
            <WhyLabsButton
              variant="outline"
              color="gray"
              aria-label="Switch to table view"
              className={cx(classes.actionButton, classes.avoidButtonTransform, {
                [classes.selectedButton]: viewMode.value === 'table',
              })}
              onClick={() => viewMode.setter('table')}
            >
              <IconTable
                size={16}
                color={viewMode.value === 'table' ? Colors.chartPrimary : Colors.secondaryLight1000}
              />
            </WhyLabsButton>
            <WhyLabsButton
              variant="outline"
              aria-label="Switch to graph view"
              color="gray"
              className={cx(classes.actionButton, classes.avoidButtonTransform, classes.noBorderLeft, {
                [classes.selectedButton]: viewMode.value === 'graph',
              })}
              onClick={() => viewMode.setter('graph')}
            >
              <IconChartBarPopular
                size={16}
                color={viewMode.value === 'graph' ? Colors.chartPrimary : Colors.secondaryLight1000}
              />
            </WhyLabsButton>
          </Button.Group>
        </WhyLabsTooltip>
        <div className={classes.badgesFlexContainer}>
          <div>
            <WhyLabsBadge className={cx(classes.badge, classes.whiteBadge)}>{resourceId}</WhyLabsBadge>
          </div>
          {batchRangeBadge()}
          {resourceColumnsBadge()}
          {filteredSegmentBadge()}
        </div>
      </div>
      <div className={cx(classes.flexRow, classes.gap10)}>
        <div className={cx(classes.flexRow, classes.gap10, classes.highlightCellsLabel)}>
          <WhyLabsText className={classes.highlightCellsLabel}>Highlight:</WhyLabsText>
          {renderHighlightOption('min')}
          {renderHighlightOption('max')}
        </div>
        <div className={cx(classes.flexRow, classes.gap5)}>
          {tableColumnsDefinition && (
            <WhyLabsActionIcon
              tooltip={getColumnManagementTooltip()}
              label="Manage table columns"
              className={classes.actionButton}
              onClick={() => displayColumnManagementModalState.setter('persistedParams')}
              disabled={isOverallSegment || !countTableColumns()}
            >
              <IconColumns3 size={15} color={Colors.secondaryLight1000} />
            </WhyLabsActionIcon>
          )}
          <WhyLabsActionIcon
            loading={loadingDownload}
            tooltip="Download table data"
            label="Download table data"
            className={classes.actionButton}
            onClick={() => {
              setLoadingDownload(true);
              downloadDataFn();
              setTimeout(() => setLoadingDownload(false), 1000);
            }}
          >
            <IconDownload size={17} color={Colors.secondaryLight1000} />
          </WhyLabsActionIcon>
        </div>
      </div>
    </div>
  );
};

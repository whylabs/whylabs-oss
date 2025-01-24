import { ReactElement, ReactNode } from 'react';
import { WhyLabsCheckboxGroup, WhyLabsTableKit } from '~/components/design-system';
import {
  RenderCellProps,
  TableColumnHorizontalAlign,
  WhyLabsTableColumnProps,
} from '~/components/design-system/responsive-table/tableUtils';
import { SimpleEmptyStateMessage } from '~/components/empty-state/SimpleEmptyStateMessage';
import { InvisibleButton } from '~/components/misc/InvisibleButton';
import useSort from '~/hooks/useSort';
import { useLlmSecureContext } from '~/routes/:resourceId/llm-trace/LlmTraceLayout';
import { useMarkedTracesSearchParams } from '~/routes/:resourceId/llm-trace/traces/components/useMarkedTracesSearchParams';
import { SortDirectionType, SortType } from '~/types/sortTypes';
import { timeLong } from '~/utils/dateUtils';
import { isString } from '~/utils/typeGuards';
import { TracesSortBy } from '~server/types/api';

import { TraceItem } from '../types/llmTraceTypes';
import { useLlmTraceTableStyles } from './LlmTraceTableStyles';
import { LlmTraceTagBadge } from './LlmTraceTagBadge';

const TABLE_HEADER_HEIGHT = 34;

const {
  Components: WhyLabsTable,
  Cells: { TextCell, HeaderCell, SortableHeaderCell, GenericCell },
} = WhyLabsTableKit;

type TableColumn = Omit<WhyLabsTableColumnProps, 'header'> & {
  headerContent: ReactElement | string;
  isHidden?: boolean;
} & (
    | {
        sortableBy?: undefined;
        sortType?: undefined;
      }
    | {
        sortableBy: TracesSortBy;
        sortType: SortType;
      }
  );

type LlmTraceTableProps = {
  data: TraceItem[];
  isLoading: boolean;
  onSelectTraceId: (id: string) => void;
  selectedId?: string;
  totalEntries: number;
};

export const LlmTraceTable = ({
  data: tableData,
  isLoading,
  onSelectTraceId,
  selectedId,
  totalEntries,
}: LlmTraceTableProps) => {
  const { classes, cx } = useLlmTraceTableStyles();
  const { sortBy, sortDirection, setSort } = useSort<TracesSortBy>();
  const { composedFilterAtom } = useLlmSecureContext();
  const { filters, onChangeConditionAndValue, onChangeValue, onChangeWholeFilter } = composedFilterAtom;
  const {
    handleRowCheckboxChange,
    handleHeaderCheckboxChange,
    hasPartialSelection,
    selectAllTracesMode,
    isTraceChecked,
    calculateSelectedTraces,
  } = useMarkedTracesSearchParams();
  const selectedTracesCount = calculateSelectedTraces(totalEntries);
  const hasData = !!tableData.length;
  const rowsCount = tableData.length;

  const onClickTag = (tag: string) => () => {
    const currentFilter = filters[0];
    const hasAnAppliedFilter = !!currentFilter.value;

    const isViolationTagsActiveFilter = currentFilter.dimension === 'violationTags';
    if (!isViolationTagsActiveFilter) {
      onChangeWholeFilter(0)({
        dimension: 'violationTags',
        condition: 'includes',
        value: tag,
      });
      return;
    }

    const hasInvalidConditionForViolationTag = !['includes', 'excludes'].find(
      (condition) => condition === currentFilter.condition,
    );
    if (hasInvalidConditionForViolationTag) {
      onChangeConditionAndValue(0)('includes', tag);
      return;
    }

    const selectedTags = new Set(
      // Must verify if the filter has a value before doing the split to prevent an known bug
      hasAnAppliedFilter && isViolationTagsActiveFilter ? currentFilter.value?.split(',') : [],
    );
    selectedTags.add(tag);
    onChangeValue(0)([...selectedTags].join(','));
  };

  return (
    <WhyLabsTable.Container
      afterTableChildren={
        !hasData &&
        !isLoading && (
          <SimpleEmptyStateMessage
            // plus two pixels to account for the header borders
            minHeight={`calc(100% - ${TABLE_HEADER_HEIGHT + 2}px)`}
            subtitle="Try refining the filters to refresh the results."
            title="No traces found"
          />
        )
      }
      fixedFirstColumn
      headerHeight={TABLE_HEADER_HEIGHT}
      isLoading={isLoading}
      isRowSelected={(index) => tableData[index].id === selectedId}
      rowsCount={isLoading ? 0 : rowsCount}
      withRowBorders={false}
      withBorder
      withHeaderBorders
      withBottomBorder
      withColumnBorders
    >
      {getColumns().map(({ headerContent, sortableBy, sortType, ...rest }) => {
        const header = (() => {
          if (isString(headerContent)) {
            return sortableBy ? (
              <SortableHeaderCell {...getSortableHeaderProps(sortableBy, sortType)}>{headerContent}</SortableHeaderCell>
            ) : (
              <HeaderCell className={classes.header}>{headerContent}</HeaderCell>
            );
          }
          return headerContent;
        })();

        return <WhyLabsTable.Column key={rest.uniqueKey} header={header} {...rest} />;
      })}
    </WhyLabsTable.Container>
  );

  function getColumns(): TableColumn[] {
    return [
      {
        cell: renderSelectTraceCell,
        headerContent: renderHeaderCheckbox(),
        fixedWidth: 'fit-content',
        uniqueKey: 'traceSelection',
      },
      {
        cell: renderTraceIdCell,
        headerContent: 'Trace ID',
        minWidth: 200,
        sortableBy: TracesSortBy.Traceid,
        sortType: 'text',
        uniqueKey: 'traceId',
      },
      {
        cell: renderTimestampCell,
        headerContent: 'Timestamp',
        minWidth: 180,
        sortableBy: TracesSortBy.Timestamp,
        sortType: 'number',
        uniqueKey: 'timestamp',
      },
      {
        cell: renderTotalPolicyIssuesCell,
        headerContent: 'Total policy issues',
        horizontalAlign: TableColumnHorizontalAlign.Right,
        minWidth: 180,
        sortableBy: TracesSortBy.Issues,
        sortType: 'number',
        uniqueKey: 'totalPolicyIssues',
      },
      {
        cell: renderViolationTagsCell,
        headerContent: 'Violation tags',
        maxWidth: '100%',
        minWidth: 210,
        uniqueKey: 'violationTags',
      },
      {
        cell: renderApplicationIdCell,
        headerContent: 'Application ID',
        minWidth: 200,
        sortableBy: TracesSortBy.Applicationid,
        sortType: 'text',
        uniqueKey: 'applicationId',
      },
      {
        cell: renderLatencyCell,
        headerContent: 'Latency',
        horizontalAlign: TableColumnHorizontalAlign.Right,
        sortableBy: TracesSortBy.Latency,
        sortType: 'number',
        uniqueKey: 'latency',
      },
      {
        cell: renderTokenUsageCell,
        headerContent: 'Token usage (total)',
        minWidth: 190,
        sortableBy: TracesSortBy.Tokens,
        sortType: 'number',
        uniqueKey: 'tokenUsage',
      },
      {
        cell: renderVersionCell,
        headerContent: 'Version',
        sortableBy: TracesSortBy.Version,
        sortType: 'text',
        uniqueKey: 'version',
      },
    ];
  }

  function renderSelectTraceCell(index: number, { isSelected }: RenderCellProps) {
    const { traceId, hasPcaCoords } = tableData[index];
    return renderCheckboxCell(traceId || null, !!isSelected, !hasPcaCoords);
  }

  function renderTotalPolicyIssuesCell(index: number, { isSelected }: RenderCellProps) {
    const { totalPolicyIssues } = tableData[index];
    return renderTextCell(totalPolicyIssues, !!isSelected);
  }

  function renderTimestampCell(index: number, { isSelected }: RenderCellProps) {
    const { startTime } = tableData[index];
    return renderTextCell(timeLong(startTime), !!isSelected);
  }

  function renderTraceIdCell(index: number, { isSelected }: RenderCellProps) {
    const { traceId } = tableData[index];
    if (!traceId) return renderTextCell('-', !!isSelected);

    return renderButtonCell(traceId, onClickTraceId(traceId), !!isSelected);
  }

  function renderViolationTagsCell(index: number, { isSelected }: RenderCellProps) {
    const { violationTags, parsedTags } = tableData[index];
    if (!violationTags) return renderTextCell('-', !!isSelected);

    return <LlmTraceTagBadge onClick={onClickTag} secureTags={parsedTags} tooltip="Click to filter" />;
  }

  function renderApplicationIdCell(index: number, { isSelected }: RenderCellProps) {
    const { applicationId } = tableData[index];
    if (!applicationId) return renderTextCell('-', !!isSelected);

    return renderTextCell(applicationId, !!isSelected);
  }

  function renderLatencyCell(index: number, { isSelected }: RenderCellProps) {
    const { latency } = tableData[index];
    return renderTextCell(latency ?? '-', !!isSelected);
  }

  function renderTokenUsageCell(index: number, { isSelected }: RenderCellProps) {
    const { inputAndCompletionTokens } = tableData[index];
    return renderTextCell(inputAndCompletionTokens ?? '-', !!isSelected);
  }

  function renderVersionCell(index: number, { isSelected }: RenderCellProps) {
    const { version } = tableData[index];
    return renderTextCell(version ?? '-', !!isSelected);
  }

  function renderButtonCell(children: ReactNode, onClick: () => void, isSelected: boolean) {
    return (
      <InvisibleButton
        className={cx(classes.dataRow, classes.cellPadding, classes.buttonCell, {
          [classes.selectedCell]: isSelected,
        })}
        onClick={onClick}
      >
        {children}
      </InvisibleButton>
    );
  }

  function renderCheckboxCell(traceId: string | null, isSelected: boolean, disabled: boolean) {
    const selectedStyle = isSelected ? classes.rowSelectedCheckbox : '';
    const value = traceId && isTraceChecked(traceId) ? ['checked'] : [];
    const isDisabled = !traceId || disabled;
    return (
      <GenericCell key={`${traceId || 'unknown-trace'}--checkbox--${value[0] || 'unchecked'}`}>
        <WhyLabsCheckboxGroup
          disabled={isDisabled}
          value={isDisabled ? undefined : value}
          disabledTooltip="This trace is not compatible with embeddings projector"
          onChange={(checked) => handleRowCheckboxChange(traceId, checked?.length ? 'check' : 'uncheck')}
          size="sm"
          label="Select trace"
          hideLabel
          options={[{ value: 'checked', label: null, classNames: { input: selectedStyle } }]}
          marginTop={0}
          darkBackground
        />
      </GenericCell>
    );
  }

  function renderHeaderCheckbox() {
    const hasAllTracesSelected = selectedTracesCount === totalEntries;
    const isChecked = hasAllTracesSelected || (selectAllTracesMode && !hasPartialSelection);
    const indeterminate = !!selectedTracesCount && hasPartialSelection && !hasAllTracesSelected;
    return (
      <GenericCell rootClassName={classes.checkboxHeaderCell}>
        <WhyLabsCheckboxGroup
          disabled={!hasData}
          onChange={(value) => handleHeaderCheckboxChange(value?.[0] === 'checked')}
          size="sm"
          label="Select all traces"
          value={isChecked && hasData ? ['checked'] : []}
          hideLabel
          options={[{ value: 'checked', label: null, indeterminate }]}
          marginTop={0}
          darkBackground
        />
      </GenericCell>
    );
  }

  function renderTextCell(children: ReactNode, isSelected: boolean) {
    return (
      <TextCell
        className={cx(classes.dataRow, classes.cellPadding, {
          [classes.selectedCell]: isSelected,
        })}
      >
        {children}
      </TextCell>
    );
  }

  function onClickTraceId(id: string) {
    return () => {
      onSelectTraceId(id);
    };
  }

  function getSortableHeaderProps(key: TracesSortBy, sortType: SortType) {
    return {
      sortDirection: sortBy === key ? sortDirection : undefined,
      sortType,
      onSortDirectionChange: onSortDirectionChange(key),
    };
  }

  function onSortDirectionChange(key: TracesSortBy) {
    return (direction: SortDirectionType) => {
      setSort(key, direction);
    };
  }
};

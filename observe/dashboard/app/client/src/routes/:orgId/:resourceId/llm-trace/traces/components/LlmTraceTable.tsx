import { WhyLabsCheckboxGroup, WhyLabsTableKit, WhyLabsTextHighlight } from '~/components/design-system';
import {
  RenderCellProps,
  TableColumnHorizontalAlign,
  WhyLabsTableColumnProps,
} from '~/components/design-system/responsive-table/tableUtils';
import { SimpleEmptyStateMessage } from '~/components/empty-state/SimpleEmptyStateMessage';
import { InvisibleButton } from '~/components/misc/InvisibleButton';
import { useFlags } from '~/hooks/useFlags';
import useSort from '~/hooks/useSort';
import { useLlmSecureContext } from '~/routes/:orgId/:resourceId/llm-trace/LlmTraceLayout';
import { useMarkedTracesSearchParams } from '~/routes/:orgId/:resourceId/llm-trace/traces/components/useMarkedTracesSearchParams';
import { SortByKeys, SortDirectionKeys, SortDirectionType, SortType } from '~/types/sortTypes';
import { TABLE_HEADER_HEIGHT } from '~/utils/constants';
import { timeLong } from '~/utils/dateUtils';
import { isNumber, isString } from '~/utils/typeGuards';
import { TracesSortBy } from '~server/trpc/meta/llm-trace/types/llmTraceTypes';
import { ReactElement, ReactNode } from 'react';

import { TraceItem } from '../types/llmTraceTypes';
import { useLlmTraceTableStyles } from './LlmTraceTableStyles';
import { LlmTraceTagBadge } from './LlmTraceTagBadge';

const {
  Components: WhyLabsTable,
  Cells: { TextCell, HeaderCell, SortableHeaderCell, GenericCell, ScrollableCell },
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
  totalTracesWithCoords: number;
};

export const LlmTraceTable = ({
  data: tableData,
  isLoading,
  onSelectTraceId,
  selectedId,
  totalEntries,
  totalTracesWithCoords,
}: LlmTraceTableProps) => {
  const { classes, cx } = useLlmTraceTableStyles();
  const { sortBy, sortDirection, setSort } = useSort<TracesSortBy>({
    sortByKey: SortByKeys.sortTracesBy,
    sortDirectionKey: SortDirectionKeys.sortTracesDirection,
  });
  const { composedFilterAtom } = useLlmSecureContext();
  const { filters, onChangeConditionAndValue, onChangeValue, onChangeWholeFilter } = composedFilterAtom;
  const flags = useFlags();
  const {
    handleRowCheckboxChange,
    handleHeaderCheckboxChange,
    hasPartialSelection,
    selectAllTracesMode,
    isTraceChecked,
    calculateSelectedTraces,
  } = useMarkedTracesSearchParams();
  const selectedTracesCount = calculateSelectedTraces(totalTracesWithCoords);
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
  const tableRowsCount = isLoading ? 0 : rowsCount;
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
      rowsCount={tableRowsCount}
    >
      {getColumns().map(({ headerContent, sortableBy, sortType, columnKey, ...rest }) => {
        const header = (() => {
          const scrollableFixedWidth =
            columnKey === 'violationTags' && isNumber(rest.fixedWidth) ? rest.fixedWidth : undefined;
          if (isString(headerContent)) {
            return sortableBy ? (
              <SortableHeaderCell
                scrollableFixedWidth={scrollableFixedWidth}
                columnKey={columnKey}
                {...getSortableHeaderProps(sortableBy, sortType)}
              >
                {headerContent}
              </SortableHeaderCell>
            ) : (
              <HeaderCell scrollableFixedWidth={scrollableFixedWidth} columnKey={columnKey} className={classes.header}>
                {headerContent}
              </HeaderCell>
            );
          }
          return headerContent;
        })();

        return (
          <WhyLabsTable.Column key={`table-column-${columnKey}`} columnKey={columnKey} header={header} {...rest} />
        );
      })}
    </WhyLabsTable.Container>
  );

  function getColumns(): TableColumn[] {
    return [
      ...(flags.llmEmbeddingsVisualizer
        ? [
            {
              cell: renderSelectTraceCell,
              headerContent: renderHeaderCheckbox(),
              fixedWidth: 'fit-content',
              columnKey: 'traceSelection',
            },
          ]
        : []),
      {
        cell: renderTraceIdCell,
        headerContent: 'Trace ID',
        minWidth: 200,
        maxWidth: 250,
        sortableBy: TracesSortBy.Traceid,
        sortType: 'text',
        columnKey: 'traceId',
      },
      {
        cell: renderTimestampCell,
        headerContent: 'Timestamp',
        minWidth: 180,
        sortableBy: TracesSortBy.Timestamp,
        sortType: 'number',
        columnKey: 'timestamp',
      },
      {
        cell: renderTotalPolicyIssuesCell,
        headerContent: 'Total policy issues',
        horizontalAlign: TableColumnHorizontalAlign.Right,
        minWidth: 180,
        sortableBy: TracesSortBy.Issues,
        sortType: 'number',
        columnKey: 'totalPolicyIssues',
      },
      {
        cell: renderViolationTagsCell,
        headerContent: 'Violation tags',
        fixedWidth: 350,
        columnKey: 'violationTags',
      },
      {
        cell: renderApplicationIdCell,
        headerContent: 'Application ID',
        minWidth: 200,
        maxWidth: 500,
        sortableBy: TracesSortBy.Applicationid,
        sortType: 'text',
        columnKey: 'applicationId',
      },
      {
        cell: renderLatencyCell,
        headerContent: 'Latency',
        horizontalAlign: TableColumnHorizontalAlign.Right,
        sortableBy: TracesSortBy.Latency,
        sortType: 'number',
        columnKey: 'latency',
      },
      {
        cell: renderTokenUsageCell,
        headerContent: 'Token usage (total)',
        minWidth: 190,
        sortableBy: TracesSortBy.Tokens,
        sortType: 'number',
        columnKey: 'tokenUsage',
      },
      {
        cell: renderVersionCell,
        headerContent: 'Version',
        sortableBy: TracesSortBy.Version,
        sortType: 'text',
        columnKey: 'version',
      },
    ];
  }

  function renderSelectTraceCell(index: number, { isSelected }: RenderCellProps) {
    const { traceId, hasPcaCoords } = tableData[index];
    return renderCheckboxCell(traceId || null, isSelected, !hasPcaCoords);
  }

  function renderTotalPolicyIssuesCell(index: number, { isSelected }: RenderCellProps) {
    const { totalPolicyIssues } = tableData[index];
    return renderTextCell(totalPolicyIssues.toString(), isSelected);
  }

  function renderTimestampCell(index: number, { isSelected }: RenderCellProps) {
    const { startTime } = tableData[index];
    return renderTextCell(timeLong(startTime), isSelected);
  }

  function renderTraceIdCell(index: number, { isSelected, columnKey }: RenderCellProps) {
    const { traceId } = tableData[index];
    if (!traceId) return renderTextCell('-', isSelected);
    const traceIdFilter = filters?.find((f) => f.dimension === 'traceId')?.value ?? '';
    const children = <WhyLabsTextHighlight highlight={traceIdFilter}>{traceId}</WhyLabsTextHighlight>;
    return renderButtonCell(children, onClickTraceId(traceId), index, isSelected, columnKey);
  }

  function renderViolationTagsCell(index: number, { columnKey, isSelected }: RenderCellProps) {
    const { parsedTags } = tableData[index];
    if (!parsedTags?.length) {
      return renderTextCell('No violations', isSelected);
    }
    return (
      <ScrollableCell key={`${columnKey}--${index}`} columnKey={columnKey}>
        <LlmTraceTagBadge onClick={onClickTag} secureTags={parsedTags} tooltip="Click to filter" />
      </ScrollableCell>
    );
  }

  function renderApplicationIdCell(index: number, { isSelected }: RenderCellProps) {
    const { applicationId } = tableData[index];
    if (!applicationId) return renderTextCell('-', isSelected);
    const applicationIdFilter = filters?.find((f) => f.dimension === 'applicationId')?.value ?? '';
    return renderTextCell(applicationId, isSelected, applicationIdFilter);
  }

  function renderLatencyCell(index: number, { isSelected }: RenderCellProps) {
    const { latency } = tableData[index];
    return renderTextCell(latency ?? '-', isSelected);
  }

  function renderTokenUsageCell(index: number, { isSelected }: RenderCellProps) {
    const { inputAndCompletionTokens } = tableData[index];
    return renderTextCell(inputAndCompletionTokens ?? '-', isSelected);
  }

  function renderVersionCell(index: number, { isSelected }: RenderCellProps) {
    const { version } = tableData[index];
    return renderTextCell(version ?? '-', isSelected);
  }

  function renderButtonCell(
    children: ReactNode,
    onClick: () => void,
    index: number,
    isSelected: boolean,
    columnKey: string,
  ) {
    return (
      <ScrollableCell columnKey={columnKey} key={`${columnKey}--${index}`}>
        <InvisibleButton
          className={cx(classes.dataRow, classes.cellPadding, classes.buttonCell, {
            [classes.selectedCell]: isSelected,
          })}
          onClick={onClick}
        >
          {children}
        </InvisibleButton>
      </ScrollableCell>
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
          disabledTooltip="This trace has no computed coordinates to view in embeddings projector"
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
    const isDisabled = !hasData || !totalTracesWithCoords;
    return (
      <GenericCell rootClassName={classes.checkboxHeaderCell}>
        <WhyLabsCheckboxGroup
          disabled={isDisabled}
          onChange={(value) => handleHeaderCheckboxChange(value?.[0] === 'checked')}
          size="sm"
          label="Select all traces"
          value={isChecked && !isDisabled ? ['checked'] : []}
          disabledTooltip="There are no traces with embeddings coordinates listed"
          hideLabel
          options={[{ value: 'checked', label: null, indeterminate }]}
          marginTop={0}
          darkBackground
        />
      </GenericCell>
    );
  }

  function renderTextCell(children: string, isSelected: boolean, highlightString = '') {
    return (
      <TextCell
        className={cx(classes.dataRow, classes.cellPadding, {
          [classes.selectedCell]: isSelected,
        })}
      >
        <WhyLabsTextHighlight highlight={highlightString}>{children}</WhyLabsTextHighlight>
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

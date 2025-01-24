import { clickChartBarTooltipFooter } from '~/components/chart/chart-utils';
import { NoDataChart } from '~/components/chart/NoDataChart';
import { TimeSeriesChart } from '~/components/chart/TimeSeriesChart';
import {
  SelectCustomItems,
  WhyLabsAccordion,
  WhyLabsLoadingOverlay,
  WhyLabsTextInput,
} from '~/components/design-system';
import { PageContentWrapper } from '~/components/page-padding-wrapper/PageContentWrapper';
import { useMainStackCustomEventsEmitters } from '~/hooks/useMainStackCustomEventsEmitters';
import { DragEvent, JSX, useState } from 'react';

import { ConstraintsEmptyState } from './ConstraintsEmptyState';
import { ResourceConstraintsTable } from './ResourceConstraintsTable';
import { useResourceConstraintsStyles } from './useResourceConstraintsStyles';
import { Constraint, useResourceConstraintsViewModel } from './useResourceConstraintsViewModel';

const COLUMN_MARKER_TOKEN = '/#/';
const DEFINITION_SPLIT_TOKEN = '/%/';
const { LabelWithLineBreakAndAnomalyCount } = SelectCustomItems;
const MIN_SIDE_PANEL_WIDTH = 300;
export const ResourceConstraintsIndex = (): JSX.Element => {
  const { classes } = useResourceConstraintsStyles();
  const viewModel = useResourceConstraintsViewModel();
  const { constraints, searchText, setSearchText, resourceId } = viewModel;
  const { navigate: navigateMainStack } = useMainStackCustomEventsEmitters();
  const [sidePanelWidth, setSidePanelWidth] = useState(300);

  return (
    <PageContentWrapper top={0} bottom={0} left={0} right={0}>
      {renderPageContent()}
    </PageContentWrapper>
  );

  function handleResizeEvent(event: DragEvent<HTMLDivElement>) {
    const screenWidth = document.body.clientWidth;
    const usedWidth = event.clientX > MIN_SIDE_PANEL_WIDTH ? event.clientX : MIN_SIDE_PANEL_WIDTH;
    const newWidthFraction = usedWidth / screenWidth;
    if (newWidthFraction > 0.6) {
      // Limit maxWidth to 60% of screen width
      setSidePanelWidth(screenWidth * 0.6);
      return;
    }
    setSidePanelWidth(usedWidth);
  }

  function renderPageContent() {
    if (constraints.isLoading) return <WhyLabsLoadingOverlay visible />;

    if (!constraints.totalResourceCount) return <ConstraintsEmptyState />;

    const hasFailedConstraints = !!constraints.failed.length;
    return (
      <div className={classes.root} data-testid="ResourceConstraintsContent">
        <aside className={classes.sidebar} style={{ minWidth: sidePanelWidth, width: sidePanelWidth }}>
          {renderSearchInput()}
          <WhyLabsAccordion.Root
            classNames={{
              content: classes.sidebarAccordionContent,
            }}
            defaultValue="failed"
          >
            <WhyLabsAccordion.Item value="failed">
              <WhyLabsAccordion.Title>Failed constraints ({constraints.failed.length})</WhyLabsAccordion.Title>
              <WhyLabsAccordion.Content>
                {hasFailedConstraints
                  ? constraints.failed.map((constraint) => renderConstraint(constraint))
                  : renderEmptyAccordionState('No failed constraints')}
              </WhyLabsAccordion.Content>
            </WhyLabsAccordion.Item>
            <WhyLabsAccordion.Item value="healthy">
              <WhyLabsAccordion.Title>Healthy constraints ({constraints.healthy.length})</WhyLabsAccordion.Title>
              <WhyLabsAccordion.Content>
                {constraints.healthy.length
                  ? constraints.healthy.map((constraint) => renderConstraint(constraint, true))
                  : renderEmptyAccordionState('No healthy constraints')}
              </WhyLabsAccordion.Content>
            </WhyLabsAccordion.Item>
          </WhyLabsAccordion.Root>
        </aside>
        <div className={classes.resizeBar} draggable onDragEnd={handleResizeEvent} />
        <main className={classes.main}>{constraints.selected ? renderMainContent() : renderEmptyStateContent()}</main>
      </div>
    );
  }

  function renderSearchInput() {
    return (
      <div className={classes.searchTextContainer}>
        <WhyLabsTextInput label="Filter" onChange={setSearchText} placeholder="Search..." value={searchText} />
      </div>
    );
  }

  function renderConstraint(constraint: Constraint, disabled = false) {
    return (
      <LabelWithLineBreakAndAnomalyCount
        classNames={{ label: classes.constraintName }}
        disabled={disabled}
        disabledTooltip="No failed constraint data"
        isActive={constraint.id === constraints.selected?.id}
        key={constraint.id}
        value={constraint.id}
        label={constraint.displayName}
        onClick={viewModel.onSelectConstraint(constraint)}
        tooltip={constraint.constraintDefinition.toString()}
        totalAnomalies={constraint.anomaliesCount}
      />
    );
  }

  function renderEmptyAccordionState(message: string) {
    return (
      <LabelWithLineBreakAndAnomalyCount
        classNames={{ label: classes.constraintName }}
        value={message}
        disabled={false}
        label={message}
      />
    );
  }

  function navigateToColumnPage(columnName: string) {
    return () => navigateMainStack({ modelId: resourceId, page: 'columns', data: { featureName: columnName } });
  }

  function renderColumnLink(columnName: string) {
    return (
      <button type="button" onClick={navigateToColumnPage(columnName)} className={classes.columnButton}>
        {columnName}
      </button>
    );
  }

  function renderConstraintDefinition() {
    if (!constraints.selected?.constraintDefinition) return null;
    const { constraintDefinition, targetMatrix } = constraints.selected;
    const columns = [...(targetMatrix?.include ?? [])];
    columns.sort((a, b) => constraintDefinition.indexOf(a) - constraintDefinition.indexOf(b));
    let definition = constraintDefinition;
    columns.forEach((c) => {
      definition = definition.replaceAll(c, `${DEFINITION_SPLIT_TOKEN}${COLUMN_MARKER_TOKEN}`);
    });
    const definitionPieces = definition.split(DEFINITION_SPLIT_TOKEN);
    return (
      <>
        {definitionPieces.map((text, i) => {
          const hasColumn = text.includes(COLUMN_MARKER_TOKEN);
          const usedText = text.replace(COLUMN_MARKER_TOKEN, '');
          const columnName = columns[i - 1];
          return (
            <span key={`${usedText}--${columnName || 'no-column'}`}>
              {hasColumn && renderColumnLink(columnName)}
              <span className={classes.chartSubtitle}>{usedText}</span>
            </span>
          );
        })}
      </>
    );
  }

  function renderMainContent() {
    return (
      <>
        {!!constraints.selected && (
          <div className={classes.chartContainer}>
            <h2 className={classes.chartTitle}>{constraints.selected.displayName}</h2>
            {renderConstraintDefinition()}
            {renderChart()}
          </div>
        )}
        <ResourceConstraintsTable />
      </>
    );
  }

  function renderEmptyStateContent() {
    return (
      <div className={classes.emptyStateContainer}>
        <NoDataChart noDataMessage="No failed constraints" />
      </div>
    );
  }

  function renderChart() {
    const { fromTimestamp, isLoading, series, toTimestamp } = viewModel.chart;

    return (
      <TimeSeriesChart
        description="Chart displaying the failed count of the selected constraint"
        height={390}
        isLoading={isLoading}
        series={series}
        spec={{
          tooltip: clickChartBarTooltipFooter,
          xAxis: {
            max: toTimestamp,
            min: fromTimestamp,
          },
          yAxis: [
            {
              title: 'Failed count',
            },
          ],
        }}
      />
    );
  }
};

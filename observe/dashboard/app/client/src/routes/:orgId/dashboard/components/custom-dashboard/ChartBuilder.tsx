import { createStyles } from '@mantine/core';
import { IconChartDots, IconChartPie, IconCirclePlus } from '@tabler/icons-react';
import { Colors } from '~/assets/Colors';
import { SectionTitle, WhyLabsButton } from '~/components/design-system';
import { WidgetBuilderLayout } from '~/routes/:orgId/dashboard/components/WidgetBuilderLayout';
import { ReactElement, useState } from 'react';

import { ChartPlotBuilder } from './ChartPlotBuilder';
import { ChartPreview } from './ChartPreview';
import { PieChartBuilder } from './PieChartBuilder';
import { ChartPlot, DashboardGraphTypes } from './types';
import { ALL_CHART_TYPES, UseChartBuilderViewModelProps, useChartBuilderViewModel } from './useChartBuilderViewModel';

const useStyles = createStyles(() => ({
  plotItemsContainer: {
    flex: 1,
    overflow: 'hidden',
    paddingBottom: 72, // buffer
  },
  plotItemsScrollContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
    overflow: 'auto',
  },
  buttonsContainer: {
    display: 'flex',
    flexDirection: 'row',
    gap: 10,
    marginTop: 15,
  },
  selectTypeContainer: {
    display: 'flex',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 30,
  },
  chartTypeButton: {
    color: Colors.secondaryLight1000,
    fontSize: 14,
    fontWeight: 500,
  },
  selectedChartTypeButton: {
    background: Colors.darkHeader,
    borderColor: Colors.darkHeader,
    color: Colors.white,
    '&:hover': {
      background: Colors.darkHeader,
      color: Colors.white,
    },
  },
}));

type ChildrenProps = {
  chartBuilderElement: ReactElement;
  handleOnClose: () => void;
};

type ChartBuilderProps = UseChartBuilderViewModelProps & {
  children: (props: ChildrenProps) => ReactElement;
  id?: string;
};

export const ChartBuilder = ({ children, ...props }: ChartBuilderProps) => {
  const { classes, cx } = useStyles();
  const [confirmLosingEditedData, setConfirmLosingEditedData] = useState(false);

  const { id, onClose } = props;

  const viewModel = useChartBuilderViewModel(props);
  const { type } = viewModel;

  const addButtonLabel = (() => {
    if (type === 'pie') return 'Add chart';

    // Defaults to timeseries
    return 'Add plot';
  })();

  const handleOnClose = () => {
    if (viewModel.isEdited) {
      setConfirmLosingEditedData(true);
      return;
    }
    onClose();
  };

  const renderPlotBuilder = (plot: ChartPlot, index: number) => {
    if (type === 'pie') {
      return (
        <PieChartBuilder
          index={index}
          key={plot.id}
          plot={plot}
          onClone={viewModel.onClonePlot(plot.id)}
          onDelete={viewModel.onDeletePlot(plot.id)}
          onUpdate={viewModel.onUpdatePlot}
          orgId={viewModel.orgId}
        />
      );
    }

    return (
      <ChartPlotBuilder
        index={index}
        key={plot.id}
        plot={plot}
        onClone={viewModel.onClonePlot(plot.id)}
        onDelete={viewModel.onDeletePlot(plot.id)}
        onUpdate={viewModel.onUpdatePlot}
        orgId={viewModel.orgId}
      />
    );
  };

  const shouldDisplayAddButton = type === 'pie' ? viewModel.plots.length < 2 : true;

  const chartBuilderElement = (
    <WidgetBuilderLayout
      onSaveWidget={viewModel.onSaveChart}
      onCancel={handleOnClose}
      disableSave={!viewModel.isEdited}
      displayName={viewModel.displayName}
      onChangeDisplayName={viewModel.onChangeDisplayName}
      losingChangesDialog={{
        isOpen: confirmLosingEditedData,
        onCancel: () => setConfirmLosingEditedData(false),
        onConfirm: onClose,
      }}
    >
      <>
        <ChartPreview chart={viewModel.currentChartObject} id={id} />
        <SectionTitle title="Select the type of visualization" />
        <div className={classes.selectTypeContainer}>{ALL_CHART_TYPES.map(renderTypeSelectionButton)}</div>
        <SectionTitle title={getSectionTitle()} />
        <div className={classes.plotItemsContainer}>
          <div className={classes.plotItemsScrollContainer}>{viewModel.plots.map(renderPlotBuilder)}</div>
          {shouldDisplayAddButton && (
            <div className={classes.buttonsContainer}>{renderGrayAddButton(addButtonLabel, viewModel.onAddPlot)}</div>
          )}
        </div>
      </>
    </WidgetBuilderLayout>
  );

  return children({ chartBuilderElement, handleOnClose });

  function getSectionTitle() {
    if (type === 'pie') return 'Select data for the pie chart';

    // Defaults to timeseries
    return 'Select data for the time series';
  }

  function renderTypeSelectionButton(typeToRender: DashboardGraphTypes) {
    const isPieChart = typeToRender === 'pie';

    const label = (() => {
      if (isPieChart) return 'Pie';

      // Defaults to timeseries
      return 'Time series';
    })();

    const icon = (() => {
      if (isPieChart) return <IconChartPie size={14} />;

      // Defaults to timeseries
      return <IconChartDots size={16} />;
    })();

    const isSelected = viewModel.type === typeToRender;
    return (
      <WhyLabsButton
        className={cx(classes.chartTypeButton, {
          [classes.selectedChartTypeButton]: isSelected,
        })}
        color="gray"
        key={typeToRender}
        leftIcon={icon}
        onClick={() => viewModel.setType(typeToRender)}
        size="xs"
        variant="subtle"
      >
        {label}
      </WhyLabsButton>
    );
  }

  function renderGrayAddButton(text: string, onClick: () => void) {
    return (
      <WhyLabsButton color="gray" leftIcon={<IconCirclePlus size={16} />} onClick={onClick} variant="outline">
        {text}
      </WhyLabsButton>
    );
  }
};

import { ApolloError } from '@apollo/client';
import { OverviewAnomalyCountWidget, OverviewAnomalyGraphContainer } from 'components/controls/widgets';
import { HeaderEmptyFillWidget } from 'components/controls/widgets/HeaderEmptyFillWidget';
import ResourcesCountWidget from 'components/controls/widgets/ResourcesCountWidget';
import { ModelsNotConfiguredWidget } from 'components/controls/widgets/ModelsNotConfiguredWidget';
import { LayoutToggleWidget } from 'pages/resource-overview-page/components/LayoutToggleWidget';
import { createStyles } from '@mantine/core';

const useStyles = createStyles({
  root: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    overflow: 'hidden',
    width: '100%',
  },
  widgetRow: {
    display: 'flex',
    flexDirection: 'row',
    width: '100%',
    overflowX: 'auto',
    overflowY: 'hidden',
    position: 'relative',
  },
});

interface OverviewHeaderPanelProps {
  loading: boolean;
  error: ApolloError | undefined;
  addResource: () => void;
  modelsHaveBeenConfigured: boolean;
  userCanManageDatasets: boolean;
  hasLayoutToggle: boolean;
  hideDailyAnomalyGraph?: boolean;
  datasetCount?: number;
  modelsCount?: number;
}

const OverviewHeaderPanel = ({
  addResource,
  loading,
  modelsHaveBeenConfigured,
  hasLayoutToggle,
  hideDailyAnomalyGraph,
  datasetCount,
  modelsCount,
  ...rest
}: OverviewHeaderPanelProps): JSX.Element => {
  const { classes: styles } = useStyles();

  const commonAddResourceProps = { loading, addResource, ...rest };

  return (
    <div className={styles.root}>
      <div className={styles.widgetRow}>
        <ResourcesCountWidget
          singleCount
          modelsCount={modelsCount}
          datasetsCount={datasetCount}
          {...commonAddResourceProps}
        />
        {!loading && !modelsHaveBeenConfigured && <ModelsNotConfiguredWidget />}
        {!loading && modelsHaveBeenConfigured && <OverviewAnomalyCountWidget />}
        {modelsHaveBeenConfigured && !hideDailyAnomalyGraph ? (
          <OverviewAnomalyGraphContainer />
        ) : (
          <HeaderEmptyFillWidget />
        )}
      </div>
      {hasLayoutToggle && <LayoutToggleWidget addResourcesButton {...commonAddResourceProps} />}
    </div>
  );
};

export default OverviewHeaderPanel;

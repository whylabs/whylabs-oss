import { useState } from 'react';
import { getParam } from 'pages/page-types/usePageType';
import { FeatureSortBy } from 'generated/graphql';
import { SortByOptions } from 'components/feature-weights/FeatureWeightsTypes';
import { useSetHtmlTitle } from 'hooks/useSetHtmlTitle';
import { ExplainabilityTabHeader } from './components/ExplainabilityTabHeader';
import { useStyles } from './ExplainabilityCSS';
import { ExplainabilityTabContent } from './components/ExplainabilityTabContent';

export const ExplainabilityTab: React.FC = () => {
  useSetHtmlTitle('Explainability');
  const { classes: styles } = useStyles();
  const paramsSort = getParam('sortModelBy') as FeatureSortBy;
  const [sortBy, setSortBy] = useState<FeatureSortBy | undefined>(
    SortByOptions.find((o) => o.value === paramsSort)?.value ?? SortByOptions[0].value,
  );
  const [selectedModel, selectModel] = useState<string | undefined>(getParam('compare') ?? undefined);
  const [showTopFeatures, setShowTopFeatures] = useState<number>(10);
  const [emptyState, setEmptyState] = useState<boolean>();
  return (
    <div className={styles.explainabilityContainer}>
      {emptyState === false && (
        <ExplainabilityTabHeader
          setShowTopFeatures={setShowTopFeatures}
          showTopFeatures={showTopFeatures}
          selectModel={selectModel}
          comparedResourceId={selectedModel}
          sortBy={sortBy}
          setSortBy={setSortBy}
        />
      )}
      <ExplainabilityTabContent
        showTopFeatures={showTopFeatures}
        comparedResourceId={selectedModel}
        sortBy={sortBy}
        setEmptyState={setEmptyState}
      />
    </div>
  );
};

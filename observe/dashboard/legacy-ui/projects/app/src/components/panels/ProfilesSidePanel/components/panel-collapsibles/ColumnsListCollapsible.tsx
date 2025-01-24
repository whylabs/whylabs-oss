import { HtmlTooltip } from '@whylabs/observatory-lib';
import { arrayOfLength } from 'utils/arrayUtils';
import { Skeleton } from '@mantine/core';
import { useResourceText } from 'pages/model-page/hooks/useResourceText';
import CheckIcon from '@material-ui/icons/Check';
import { useSearchFeatureList } from 'hooks/useSearchFeatureList';
import { WhyLabsAccordion, WhyLabsButton, WhyLabsText, WhyLabsTooltip } from 'components/design-system';
import { useProfileSidePanelStyles } from '../../ProfileSidePanelCSS';

const COMPONENT_TEXTS = {
  DATA: {
    expandFeatureText: 'Click on columns to filter the view:',
    expandOutputText: 'Click on outputs to filter the view:', // will be displayed in DataTransform
    featureListTitle: 'Column list',
    outputListTitle: 'Output list', // will be displayed in DataTransform
    featureListTooltip: 'The list of all columns that are included in the selected profile.',
    outputListTooltip: 'The list of all outputs that are included in the selected profile.',
    loadMoreFeaturesText: 'Load more columns',
    loadMoreOutputsText: 'Load more outputs', // will be displayed in DataTransform
  },
  MODEL: {
    expandFeatureText: 'Click on features to filter the view:',
    expandOutputText: 'Click on outputs to filter the view:',
    featureListTitle: 'Feature list',
    outputListTitle: 'Output list',
    featureListTooltip: 'The list of all features that are included in the selected profile.',
    outputListTooltip: 'The list of all outputs that are included in the selected profile.',
    loadMoreFeaturesText: 'Load more features',
    loadMoreOutputsText: 'Load more outputs',
  },
  LLM: {
    expandFeatureText: 'Click on metrics to filter the view:',
    expandOutputText: 'Click on metrics to filter the view:',
    featureListTitle: 'Metrics list',
    outputListTitle: 'Metric list',
    featureListTooltip: 'The list of all metrics that are included in the selected profile.',
    outputListTooltip: 'The list of all metrics that are included in the selected profile.',
    loadMoreFeaturesText: 'Load more metrics',
    loadMoreOutputsText: 'Load more metrics',
  },
};

interface ColumnsListCollapsibleProps {
  columnsList: string[];
  type: 'features' | 'outputs';
  loading: boolean;
  allowLoadMore: boolean;
  loadMoreHandler: () => void;
}
export const ColumnsListCollapsible: React.FC<ColumnsListCollapsibleProps> = ({
  columnsList,
  type,
  loading,
  allowLoadMore,
  loadMoreHandler,
}) => {
  const { classes: styles, cx } = useProfileSidePanelStyles();
  const { resourceTexts } = useResourceText(COMPONENT_TEXTS);
  const { featureList: featureChipsList, setFeature: setFeatureChipsList } = useSearchFeatureList();
  const updateFilterFromList = (filterFeature: string) => {
    setFeatureChipsList([...featureChipsList, filterFeature]);
  };

  const renderColumnList = (column: string[]): JSX.Element => {
    return (
      <>
        {column.map((columnName) => {
          const isSelected = featureChipsList.includes(columnName);
          return (
            <li
              key={columnName}
              className={cx(
                styles.featureListItem,
                styles.featureListItemHover,
                isSelected && styles.featureListItemSelected,
              )}
              aria-hidden="true"
            >
              <WhyLabsTooltip label={columnName} position="right">
                <div className={cx(styles.spaceBetween)}>
                  <WhyLabsButton
                    variant="subtle"
                    onClick={() => {
                      if (!isSelected) updateFilterFromList(columnName);
                    }}
                    className={cx(
                      styles.textButton,
                      styles.featureListItemText,
                      isSelected && styles.featureListItemTextSelected,
                    )}
                  >
                    <div className={styles.overflowEllipsis}>{columnName}</div>
                  </WhyLabsButton>
                  {isSelected && <CheckIcon />}
                </div>
              </WhyLabsTooltip>
            </li>
          );
        })}
      </>
    );
  };
  const isFeatures = type === 'features';

  return (
    <WhyLabsAccordion.Item value={type}>
      <WhyLabsAccordion.Title>
        <WhyLabsText inherit className={styles.textTitle}>
          {isFeatures ? resourceTexts.featureListTitle : resourceTexts.outputListTitle}
          <HtmlTooltip
            tooltipContent={isFeatures ? resourceTexts.featureListTooltip : resourceTexts.outputListTooltip}
          />
        </WhyLabsText>
      </WhyLabsAccordion.Title>
      <WhyLabsAccordion.Content className={styles.expandableAccordionContent}>
        <WhyLabsText inherit className={styles.subtitleText}>
          {isFeatures ? resourceTexts.expandFeatureText : resourceTexts.expandOutputText}
        </WhyLabsText>

        <div className={cx(styles.featureListContent)}>
          <ul className={styles.featureList}>{loading ? renderListSkeleton() : renderColumnList(columnsList)}</ul>
          {allowLoadMore && (
            <WhyLabsButton
              width="full"
              variant="subtle"
              disabled={loading}
              disabledTooltip="Loading..."
              onClick={() => loadMoreHandler()}
              className={styles.textButton}
            >
              {isFeatures ? resourceTexts.loadMoreFeaturesText : resourceTexts.loadMoreOutputsText}
            </WhyLabsButton>
          )}
        </div>
      </WhyLabsAccordion.Content>
    </WhyLabsAccordion.Item>
  );

  function renderListSkeleton() {
    return arrayOfLength(Math.max(10, columnsList.length)).map((index) => (
      <li key={index} className={styles.featureListItem}>
        <Skeleton width="100%" height={24} />
      </li>
    ));
  }
};

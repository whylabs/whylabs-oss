import { HtmlTooltip } from '@whylabs/observatory-lib';
import { useModelWidgetStyles } from 'hooks/useModelWidgetStyles';
import { FeatureSortBy } from 'generated/graphql';
import { FilterArea } from 'components/filter-area/FilterArea';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { WhyLabsSelect, WhyLabsText } from 'components/design-system';
import { Radio, Group } from '@mantine/core';
import { ExplainabilityTabProps, SortByOptions } from 'components/feature-weights/FeatureWeightsTypes';
import { useQueryParams } from 'utils/queryUtils';
import { useResourcesSelectorData } from 'hooks/useResourcesSelectorData';
import { useStyles } from '../ExplainabilityCSS';

interface ExplainabilityTabHeaderProps extends ExplainabilityTabProps {
  setShowTopFeatures: (n: number) => void;
  selectModel: (model?: string) => void;
  setSortBy: (s?: FeatureSortBy) => void;
}
export const ExplainabilityTabHeader: React.FC<ExplainabilityTabHeaderProps> = ({
  showTopFeatures,
  setShowTopFeatures,
  selectModel,
  comparedResourceId,
  sortBy,
  setSortBy,
}) => {
  const { classes: widgetStyles, cx } = useModelWidgetStyles();
  const { classes: styles } = useStyles();
  const { modelId } = usePageTypeWithParams();
  const { resourcesList, isLoading } = useResourcesSelectorData({ displayLabelAs: 'name' });

  const { deleteQueryParam, setQueryParam } = useQueryParams();

  const showTopFeaturesChange = (topK: string) => {
    setQueryParam('showfeatures', topK);
    setShowTopFeatures(Number(topK));
  };

  const onComparisonChange = (id: string | null) => {
    if (id) {
      selectModel(id);
      setQueryParam('compare', id);
    } else {
      selectModel(undefined);
      deleteQueryParam('compare');
    }
  };

  const onSortChange = (selectedValue: FeatureSortBy | null) => {
    setSortBy(selectedValue ?? undefined);
    setQueryParam('sortModelBy', selectedValue);
  };

  const topFeaturesRadioOptions = [10, 25, 50, 0];

  return (
    <div className={styles.widgetHeader}>
      <FilterArea titleText="Search features" tooltipContent="Search filtering by feature's name" />
      <div className={styles.root}>
        <div className={widgetStyles.headlineColumn}>
          <WhyLabsText className={cx(widgetStyles.bolded, widgetStyles.headline)}>Show top features</WhyLabsText>
          <Radio.Group size="xs" className={styles.widgetActions} onChange={showTopFeaturesChange}>
            <Group>
              {topFeaturesRadioOptions.map((n) => (
                <Radio checked={showTopFeatures === n} value={n.toString()} label={n || 'Show all'} />
              ))}
            </Group>
          </Radio.Group>
        </div>
      </div>
      <div className={cx(styles.root, styles.finalWidget)}>
        <div className={widgetStyles.headlineColumn}>
          <WhyLabsText className={cx(widgetStyles.bolded, widgetStyles.headline)}>
            Sort by
            <div className={styles.sortDropdown}>
              <WhyLabsSelect
                label="sort"
                hideLabel
                placeholder="Select"
                data={SortByOptions}
                value={sortBy}
                onChange={onSortChange}
                loading={SortByOptions === undefined}
              />
            </div>
          </WhyLabsText>
        </div>
      </div>
      <div className={cx(styles.root, styles.finalWidget)}>
        <div className={widgetStyles.headlineColumn} id="model-comparison">
          <WhyLabsText className={cx(widgetStyles.bolded, widgetStyles.headline)}>
            Model comparison
            <HtmlTooltip tooltipContent="Compare feature weights of models side-by-side" />
            <div className={styles.compareDropdown}>
              <WhyLabsSelect
                data={resourcesList?.filter((item) => item.value !== modelId) ?? []}
                value={comparedResourceId}
                searchable
                clearable
                onChange={onComparisonChange}
                label="Model comparison"
                hideLabel
                loading={isLoading}
              />
            </div>
          </WhyLabsText>
        </div>
      </div>
    </div>
  );
};

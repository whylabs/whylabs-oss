import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FeatureSortBy,
  GetFeatureWeightsQuery,
  SortDirection,
  useGetFeatureWeightsQuery,
  useGetModelDataAvailabilityQuery,
} from 'generated/graphql';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { GenericTooltip } from 'components/tooltips/GenericTooltip';
import {
  ExplainabilityTabProps,
  FeatureHover,
  sortByDefaultDirection,
  useColorSchemePalette,
} from 'components/feature-weights/FeatureWeightsTypes';
import { renderLegendItem } from 'components/visualizations/vizutils/shapeUtils';
import { useSearchParams } from 'react-router-dom';
import { FilterKeys } from 'hooks/useFilterQueryString';
import { NoDataMessagePage } from 'pages/no-data-message-page/NoDataMessagePage';
import { useSuperGlobalDateRange } from 'components/super-date-picker/hooks/useSuperGlobalDateRange';
import { useStyles } from '../ExplainabilityCSS';
import { FeatureWeightsTable } from './FeatureWeightsTable';

interface ExplainabilityTabTableProps extends ExplainabilityTabProps {
  setEmptyState: (hasWeights: boolean) => void;
}

export const ExplainabilityTabContent: React.FC<ExplainabilityTabTableProps> = ({
  comparedResourceId,
  showTopFeatures,
  sortBy,
  setEmptyState,
}) => {
  const { classes: styles } = useStyles();
  const pt = usePageTypeWithParams();
  const [searchParams] = useSearchParams();
  const explainabilityTable = useRef<HTMLDivElement | null>(null);
  const [hovered, setHovered] = useState<FeatureHover | undefined>();
  const { dateRange, loading: loadingDateRange } = useSuperGlobalDateRange();
  const { from: fromTimestamp, to: toTimestamp } = dateRange;
  const searchFilter = searchParams.get(FilterKeys.searchString);
  const { data: dataAvailability, loading: dataAvailabilityLoading } = useGetModelDataAvailabilityQuery({
    variables: { modelId: pt.modelId },
  });
  const dataIsAvailable = dataAvailabilityLoading || Boolean(dataAvailability?.model?.dataAvailability?.hasData);
  // establish a default sorting mechanism if none was provided via the props
  const sortingMechanism = sortBy ?? FeatureSortBy.WeightRank;
  const baseOptions = {
    by: sortingMechanism,
    direction: sortByDefaultDirection.get(sortingMechanism) ?? SortDirection.Asc,
    limit: showTopFeatures,
    filter: {
      substring: searchFilter || undefined,
      fromTimestamp,
      toTimestamp,
    },
  };

  const { data: weightsDataLeft } = useGetFeatureWeightsQuery({
    variables: {
      id: pt.modelId,
      ...baseOptions,
    },
    skip: loadingDateRange,
  });
  const { data: weightsDataRight } = useGetFeatureWeightsQuery({
    variables: {
      id: comparedResourceId ?? '',
      ...baseOptions,
    },
    skip: !comparedResourceId || loadingDateRange,
  });

  useEffect(() => {
    setEmptyState(!!(weightsDataLeft && !weightsDataLeft?.model?.weightMetadata?.hasWeights));
  }, [setEmptyState, weightsDataLeft]);

  const primaryColorScheme = useColorSchemePalette('primary');
  const secondaryColorScheme = useColorSchemePalette('secondary');

  const modelsHaveFeatureWeight = useCallback(() => {
    const haveFeatureWeight = (data?: GetFeatureWeightsQuery) => {
      const featureWeight = data?.model?.filteredFeatures.results.find(({ name }) => name === hovered?.featureName);
      if (typeof featureWeight?.weight?.value === 'number') {
        return { modelName: data?.model?.name, featureWeight };
      }
      return null;
    };
    return [
      { bgColor: primaryColorScheme, model: haveFeatureWeight(weightsDataLeft) },
      { bgColor: secondaryColorScheme, model: haveFeatureWeight(weightsDataRight) },
    ].filter(({ model }) => model?.featureWeight);
  }, [primaryColorScheme, weightsDataLeft, secondaryColorScheme, weightsDataRight, hovered?.featureName]);

  const showRightTable = !!(weightsDataLeft?.model?.weightMetadata?.hasWeights && weightsDataRight?.model);

  if (!dataIsAvailable)
    return (
      <div style={{ flex: 1 }}>
        <NoDataMessagePage />
      </div>
    );
  return (
    <div ref={explainabilityTable} style={{ position: 'relative', minHeight: '200px' }}>
      <div className={styles.pageContainer} style={{ gridTemplateColumns: showRightTable ? '1fr 1fr' : '1fr' }}>
        {weightsDataLeft?.model && (
          <div className={styles.left}>
            <FeatureWeightsTable
              props={weightsDataLeft}
              modelId={pt.modelId}
              hovered={hovered}
              setHovered={setHovered}
              colorScheme={primaryColorScheme}
              tableRef={explainabilityTable.current}
              showModelName={showRightTable}
            />
          </div>
        )}
        {showRightTable && (
          <div className={styles.right}>
            <FeatureWeightsTable
              props={weightsDataRight ?? {}}
              modelId={comparedResourceId ?? ''}
              colorScheme={secondaryColorScheme}
              hovered={hovered}
              setHovered={setHovered}
              tableRef={explainabilityTable.current}
              showModelName
            />
          </div>
        )}
      </div>
      {hovered?.hoverData && !!modelsHaveFeatureWeight().length && (
        <GenericTooltip element={explainabilityTable.current} hover={hovered.hoverData}>
          <div className={styles.tooltipRoot}>
            <span className={styles.tooltipFeatureName}>{hovered.featureName}</span>
            {modelsHaveFeatureWeight().map((tooltipWeight) => {
              const value = tooltipWeight.model?.featureWeight.weight?.value;
              const scheme = (value ?? 0) >= 0 ? 'positive' : 'negative';
              const { bgColor } = tooltipWeight.bgColor[scheme];
              return (
                <div className={styles.flexRow}>
                  {renderLegendItem(bgColor, '', undefined, 'box')}
                  <div className={styles.spaceBetween}>
                    <span className={styles.tooltipModelName}>{tooltipWeight.model?.modelName}</span>
                    <span className={styles.tooltipWeightValue}>{value}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </GenericTooltip>
      )}
    </div>
  );
};

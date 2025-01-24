import { useResizeObserver, useDebouncedState } from '@mantine/hooks';
import { WhyLabsText } from 'components/design-system';
import {
  ColoredCategoryData,
  OverlaidColumnHighchart,
} from 'components/visualizations/OverlaidColumnCharts/OverlaidColumnHighchart';
import { Loader, Center } from '@mantine/core';
import { useEffect, useMemo } from 'react';
import { ProfilesFrequentItemsTable } from './ProfilesFrequentItemsTable';
import { FrequentItemsRow } from './tableTypes';
import { useProfileFeaturePanelStyles } from './ProfilesFeaturePanelCSS';

interface FrequentItemsTabComponentProps {
  categoryList: string[];
  categoryCountData: ColoredCategoryData[];
  loading: boolean;
}

export function FrequentItemsTabComponent({
  categoryList,
  categoryCountData,
  loading,
}: FrequentItemsTabComponentProps): JSX.Element {
  const { classes } = useProfileFeaturePanelStyles();
  const [ref, rect] = useResizeObserver();
  const [noBlinkLoading, setNoBlinkLoading] = useDebouncedState(loading, 400, { leading: true });

  useEffect(() => {
    setNoBlinkLoading(loading);
  }, [loading, setNoBlinkLoading]);
  const profileColumns = categoryCountData.map((countData) => ({
    name: countData.name,
    color: countData.color,
  }));
  const profileCount = categoryCountData.length;
  const rows = categoryList.reduce<FrequentItemsRow[]>((acc, category) => {
    return [
      ...acc,
      {
        item: category,
        profileCounts: [
          profileCount > 0 ? categoryCountData[0].data.get(category) ?? null : null,
          profileCount > 1 ? categoryCountData[1].data.get(category) ?? null : null,
          profileCount > 2 ? categoryCountData[2].data.get(category) ?? null : null,
        ],
      },
    ];
  }, []);
  const hasCategories = categoryList.length > 0;

  const sortedCategories = useMemo(() => {
    if (categoryCountData.length === 0 || !categoryList.length) return [];
    const category = categoryCountData[0]; // always sort by the first profile for now
    const kvPairs = Array.from(category.data.entries());
    kvPairs.sort((a, b) => {
      return (b[1] ?? 0) - (a[1] ?? 0);
    });
    const sortedKeys = kvPairs.map((pair) => pair[0]);
    const leftOutKeys = categoryList.filter((key) => !sortedKeys.includes(key));
    return [...sortedKeys, ...leftOutKeys];
  }, [categoryCountData, categoryList]);

  const renderLoading = () => {
    return (
      <Center>
        <Loader className={classes.loader} />
      </Center>
    );
  };
  const renderColumnChart = () => {
    return (
      <>
        <WhyLabsText inherit className={classes.sectionLabel}>
          Frequent items plot
        </WhyLabsText>
        {hasCategories ? (
          <OverlaidColumnHighchart
            graphHeight={300}
            graphWidth={rect.width}
            categoryCounts={categoryCountData}
            categories={sortedCategories}
            graphHorizontalBuffer={0}
            graphVerticalBuffer={0}
          />
        ) : (
          <WhyLabsText inherit className={classes.noDataText}>
            Frequent items data not available
          </WhyLabsText>
        )}
      </>
    );
  };
  const combinedLoading = noBlinkLoading || loading;
  return (
    <div className={classes.tabRoot}>
      <div ref={ref}>{combinedLoading ? renderLoading() : renderColumnChart()}</div>
      {hasCategories && !combinedLoading && (
        <WhyLabsText inherit className={classes.sectionLabel}>
          Frequent items data
        </WhyLabsText>
      )}
      {hasCategories && !combinedLoading && <ProfilesFrequentItemsTable profileColumns={profileColumns} rows={rows} />}
    </div>
  );
}

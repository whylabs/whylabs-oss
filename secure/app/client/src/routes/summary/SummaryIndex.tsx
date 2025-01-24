import { createStyles } from '@mantine/core';
import { ReactElement } from 'react';
import { Colors } from '~/assets/Colors';
import { SkeletonGroup } from '~/components/design-system';
import { SinglePageLayout } from '~/components/layout/SinglePageLayout';
import { ResourceCard } from '~/routes/summary/components/ResourceCard';
import { useSummaryIndexViewModel } from '~/routes/summary/useSummaryIndexViewModel';

const useStyles = createStyles({
  root: {
    padding: '20px 30px',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, 250px)',
    justifyContent: 'center',
    gap: 20,
    background: Colors.secondaryLight100,
    height: 'min-content',
  },
});

export const SummaryIndex = (): ReactElement => {
  const viewModel = useSummaryIndexViewModel();
  const { classes } = useStyles();
  const pageContent = (() => {
    if (viewModel.isLoadingResources) {
      return (
        <div className={classes.root}>
          <SkeletonGroup count={10} height={300} />
        </div>
      );
    }
    return (
      <div className={classes.root}>
        {viewModel.resourcesData?.map((resource) => (
          <ResourceCard data={resource} key={resource.id} />
        ))}
      </div>
    );
  })();

  return (
    <SinglePageLayout datePickerConfig={{ visible: true }} pageTitle="Project Dashboard">
      {pageContent}
    </SinglePageLayout>
  );
};

import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import { SkeletonGroup } from '~/components/design-system';
import { SinglePageLayout } from '~/components/layout/SinglePageLayout';
import { UnfinishedFeatureFlag } from '~/components/misc/UnfinishedFeatureFlag';
import { ResourceCard } from '~/routes/:orgId/summary/components/ResourceCard';
import { useSummaryIndexViewModel } from '~/routes/:orgId/summary/useSummaryIndexViewModel';
import { ReactElement } from 'react';

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
    <UnfinishedFeatureFlag>
      <SinglePageLayout
        headerFields={[
          {
            data: viewModel.organizationsList,
            label: 'Organization',
            onChange: viewModel.onChangeOrganization,
            value: viewModel.orgId,
            type: 'select',
          },
        ]}
        datePickerConfig={{ visible: true }}
        pageTitle="Project Dashboard"
      >
        {pageContent}
      </SinglePageLayout>
    </UnfinishedFeatureFlag>
  );
};

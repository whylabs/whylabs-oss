import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import {
  SelectCustomItems,
  Tab,
  WhyLabsButton,
  WhyLabsControlledTabs,
  WhyLabsTooltip,
} from '~/components/design-system';
import WhyLabsTitle from '~/components/design-system/typography/WhyLabsTitle';
import { HeaderField, SinglePageLayout } from '~/components/layout/SinglePageLayout';
import { useFlags } from '~/hooks/useFlags';
import {
  LLM_TRACE_POLICY_TAB,
  LLM_TRACE_SUMMARY_TAB,
  LLM_TRACE_TRACES_TAB,
  getBreadcrumbPageTitle,
} from '~/routes/:orgId/:resourceId/llm-trace/utils/tabUtils';
import { forceRedirectToOrigin } from '~/utils/oldStackUtils';
import { TimePeriod } from '~server/graphql/generated/graphql';
import { Navigate, Outlet, useOutletContext } from 'react-router-dom';

import { useLlmTraceLayoutViewModel } from './useLlmTraceLayoutViewModel';

const useStyles = createStyles(() => ({
  main: {
    backgroundColor: Colors.white,
    display: 'flex',
    flexDirection: 'column',
  },
  tabsPanel: {
    padding: 0,
  },
  tabsList: {
    background: Colors.secondaryLight100,
    padding: '18px 15px 0 15px',
  },
  tabLabel: {
    textTransform: 'capitalize',
  },
  titleWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 24,
  },
  pageTitle: {
    color: Colors.secondaryLight100,
    fontSize: 14,
    lineHeight: 1.71,
    fontWeight: 400,
    margin: 0,
    whiteSpace: 'nowrap',
  },
  embeddingsVersionButton: {
    color: 'white',
    fontSize: 12,
    fontWeight: 400,
    lineHeight: 1,
    letterSpacing: '-0.12px',
    fontFamily: 'Asap',
    '&:hover': {
      color: Colors.secondaryLight200,
      background: Colors.darkCodeBackground,
    },
  },
}));

export function useLlmSecureContext() {
  return useOutletContext<ReturnType<typeof useLlmTraceLayoutViewModel>>();
}

export const LlmTraceLayout = () => {
  const { classes } = useStyles();
  const viewModel = useLlmTraceLayoutViewModel();
  const { breadcrumbs, selectedTab, getNavUrl, isEmbeddingsProjector, embeddingsProjector } = viewModel;
  const { orgCrumb, resourceCrumb } = breadcrumbs;
  const flags = useFlags();
  const activeTab = getBreadcrumbPageTitle.get(selectedTab ?? '') ?? 'LLM Secure';

  if (!flags.llmSecureOverall) {
    forceRedirectToOrigin();
    return null;
  }

  if (!flags.llmEmbeddingsVisualizer && isEmbeddingsProjector) {
    // Safe redirect back mechanism for users trying to access using the URL
    const url = getNavUrl({ page: 'llm-secure', llmSecure: { path: 'traces' } });
    return <Navigate to={url} />;
  }

  const headerFields: HeaderField[] = flags.llmTraceResourcesSelect
    ? [
        {
          data: viewModel.resources.data,
          itemComponent: SelectCustomItems.GenericFlexColumnItem,
          label: 'Resource',
          loading: viewModel.resources.isLoading,
          value: viewModel.resourceId,
          onChange: viewModel.onChangeResource,
          type: 'select',
        },
      ]
    : [];

  const tabs: Tab[] = (() => [
    {
      label: LLM_TRACE_SUMMARY_TAB,
    },
    {
      label: LLM_TRACE_TRACES_TAB,
    },
    {
      label: LLM_TRACE_POLICY_TAB,
    },
  ])();

  const renderEmbeddingsProjectorTitle = () => {
    const { spaceVersionsState, modalIsOpenState, selectedSpaceVersion } = embeddingsProjector;
    return (
      <div className={classes.titleWrapper}>
        <WhyLabsTitle element="h1" className={classes.pageTitle}>
          Embeddings Projector
        </WhyLabsTitle>
        {(spaceVersionsState.value?.size ?? 0) > 1 && (
          <WhyLabsTooltip label="Select a different space to see other selected traces embeddings">
            <WhyLabsButton
              className={classes.embeddingsVersionButton}
              variant="outline"
              color="gray"
              size="xs"
              onClick={() => modalIsOpenState.setter(true)}
            >
              Space version{selectedSpaceVersion?.dataMajorVersion ? `: ${selectedSpaceVersion?.dataMajorVersion}` : ''}
            </WhyLabsButton>
          </WhyLabsTooltip>
        )}
      </div>
    );
  };

  return (
    <SinglePageLayout
      classNames={{ main: classes.main }}
      displayBetaBadge
      pageTitle={isEmbeddingsProjector ? renderEmbeddingsProjectorTitle() : undefined}
      breadCrumbs={[orgCrumb, resourceCrumb, { title: activeTab }]}
      datePickerConfig={isEmbeddingsProjector ? undefined : { visible: true, timePeriod: TimePeriod.Pt1H }}
      headerFields={headerFields}
      onClosePage={viewModel.onClosePage}
    >
      {!isEmbeddingsProjector && (
        <WhyLabsControlledTabs
          activeTab={viewModel.selectedTab}
          classNames={{
            tabsPanel: classes.tabsPanel,
            tabsList: classes.tabsList,
            tabLabel: classes.tabLabel,
          }}
          onTabChange={viewModel.onChangeTab}
          tabs={tabs}
        />
      )}

      <Outlet context={viewModel} />
    </SinglePageLayout>
  );
};

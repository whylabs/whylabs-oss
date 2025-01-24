import { createStyles } from '@mantine/core';
import { Outlet, useOutletContext } from 'react-router-dom';
import { Colors } from '~/assets/Colors';
import { SelectCustomItems, Tab, WhyLabsControlledTabs } from '~/components/design-system';
import { HeaderField, SinglePageLayout } from '~/components/layout/SinglePageLayout';
import {
  LLM_TRACE_POLICY_TAB,
  LLM_TRACE_SUMMARY_TAB,
  LLM_TRACE_TRACES_TAB,
} from '~/routes/:resourceId/llm-trace/utils/tabUtils';
import { TimePeriod } from '~server/types/api';

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
}));

export function useLlmSecureContext() {
  return useOutletContext<ReturnType<typeof useLlmTraceLayoutViewModel>>();
}

export const LlmTraceLayout = () => {
  const { classes } = useStyles();
  const viewModel = useLlmTraceLayoutViewModel();

  const headerFields: HeaderField[] = [
    {
      data: viewModel.resources.data,
      itemComponent: SelectCustomItems.GenericFlexColumnItem,
      label: 'Resource',
      loading: viewModel.resources.isLoading,
      value: viewModel.resourceId,
      onChange: viewModel.onChangeResource,
      type: 'select',
    },
  ];

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

  return (
    <SinglePageLayout
      classNames={{ main: classes.main }}
      displayBetaBadge
      datePickerConfig={{ visible: true, timePeriod: TimePeriod.Pt1H }}
      headerFields={headerFields}
    >
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

      <Outlet context={viewModel} />
    </SinglePageLayout>
  );
};

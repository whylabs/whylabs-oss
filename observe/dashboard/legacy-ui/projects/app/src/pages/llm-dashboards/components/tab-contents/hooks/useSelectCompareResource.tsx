import { WhyLabsHeaderInput } from 'components/panels/header/WhyLabsHeader';
import { SelectCustomItems } from 'components/design-system';
import { ModelType } from 'generated/graphql';
import { useContext } from 'react';
import { DashboardTabsContext } from 'pages/llm-dashboards/DashboardTabsContext';
import { useResourceContext } from 'pages/model-page/hooks/useResourceContext';
import { useResourcesSelectorData, generateGroupName } from 'hooks/useResourcesSelectorData';
import { DEFAULT_SELECT_WIDTH } from '../utils';

type SelectControlsHookType = {
  compareWithResourceSelector: WhyLabsHeaderInput;
};
export const useSelectCompareResource = (): SelectControlsHookType => {
  const [{ compareWithResourceId }, dispatchTabs] = useContext(DashboardTabsContext);
  const { resourcesList, isLoading } = useResourcesSelectorData({
    displayLabelAs: 'id',
    filterByType: ModelType.Llm,
  });
  const {
    resourceState: { resource },
  } = useResourceContext();
  const currentBatchFrequency = resource?.batchFrequency ?? null;

  const selectableResources = () => {
    if (!currentBatchFrequency) {
      return [];
    }
    return resourcesList
      .map((item) => ({
        ...item,
        disabled: item.group !== generateGroupName(currentBatchFrequency),
        disabledTooltip: `You can't compare resources with different batch frequencies`,
      }))
      .sort((a, b) => Number(a.disabled) - Number(b.disabled));
  };

  const compareWithResourceSelector: WhyLabsHeaderInput = {
    kind: 'select',
    width: DEFAULT_SELECT_WIDTH,
    key: 'model-comparison-selector',
    props: {
      id: 'model-comparison-selector',
      itemComponent: SelectCustomItems.GenericFlexColumnItem,
      loading: isLoading,
      label: 'Compare with',
      placeholder: 'Select a resource',
      value: compareWithResourceId,
      data: selectableResources(),
      onChange: (value: string | null) => dispatchTabs({ compareWithResourceId: value }),
      clearable: true,
    },
  };

  return {
    compareWithResourceSelector,
  };
};

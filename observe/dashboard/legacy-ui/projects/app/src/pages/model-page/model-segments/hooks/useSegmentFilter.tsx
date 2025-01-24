import KeyValueMultiSelect, { KeyValueMultiSelectProps } from 'components/filter/KeyValueMultiSelect';
import { SegmentTag, useGetSegmentKeysQuery, useGetSegmentValueForKeyQuery } from 'generated/graphql';
import { useMemo, useState } from 'react';

type UseSegmentFilterProps = {
  allowWildcardSegment?: boolean;
  onChange: (filters: SegmentTag[]) => void;
  resourceId: string;
  selectedSegment: SegmentTag[];
};

type RenderFilterProps = Pick<
  KeyValueMultiSelectProps,
  'className' | 'disabled' | 'hideIcon' | 'hideLabel' | 'label' | 'labelTooltip' | 'placeholder' | 'maxDropdownHeight'
> & {
  persistOnUrl?: boolean;
};

export function useSegmentFilter({
  allowWildcardSegment = false,
  onChange,
  resourceId,
  selectedSegment,
}: UseSegmentFilterProps): {
  renderFilter: (props: RenderFilterProps) => JSX.Element;
} {
  const [selectedKey, setSelectedKey] = useState('');

  const commonVariables = {
    modelId: resourceId,
    tags: selectedSegment,
  };
  const { data: keysData, loading: isLoadingKeys } = useGetSegmentKeysQuery({
    variables: commonVariables,
    skip: !resourceId,
  });
  const { data: valuesData, loading: isLoadingValues } = useGetSegmentValueForKeyQuery({
    skip: !selectedKey || !resourceId,
    variables: { ...commonVariables, key: selectedKey },
  });

  const data = useMemo(() => {
    if (!selectedKey && keysData?.searchSegmentKeys) {
      return keysData.searchSegmentKeys.filter((key) => !selectedSegment.find(({ key: segKey }) => key === segKey));
    }

    if (selectedKey && valuesData?.searchSegmentValues) {
      const allValues = valuesData.searchSegmentValues.map((v) => `${selectedKey}=${v}`);

      if (allowWildcardSegment) return [`${selectedKey}=*`, ...allValues];

      return allValues;
    }
    return [];
  }, [allowWildcardSegment, keysData, selectedKey, selectedSegment, valuesData]);

  return {
    renderFilter,
  };

  function renderFilter(props: RenderFilterProps) {
    const isLoading = isLoadingKeys || isLoadingValues;

    return (
      <KeyValueMultiSelect
        data={data}
        isLoading={isLoading}
        maxDropdownHeight={400}
        onChange={onChange}
        selectedKey={selectedKey}
        setSelectedKey={setSelectedKey}
        selectedPeers={selectedSegment}
        displayRightButtons={!!selectedSegment?.length && !!data.length}
        {...props}
      />
    );
  }
}

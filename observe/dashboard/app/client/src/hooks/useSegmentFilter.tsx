import KeyValueMultiSelect, { KeyValueMultiSelectProps } from '~/components/filter/KeyValueMultiSelect';
import KeyValueSelect from '~/components/filter/KeyValueSelect';
import { trpc } from '~/utils/trpc';
import { SegmentTag } from '~server/graphql/generated/graphql';
import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

type UseSegmentFilterProps = {
  allowWildcardSegment?: boolean;
  onChange: (filters: SegmentTag[]) => void;
  resourceId: string;
  selectedSegment: SegmentTag[];
  singleSegmentSelector?: boolean;
};

type RenderFilterProps = Pick<
  KeyValueMultiSelectProps,
  'className' | 'disabled' | 'hideIcon' | 'hideLabel' | 'label' | 'placeholder' | 'maxDropdownHeight'
> & {
  persistOnUrl?: boolean;
};

export function useSegmentFilter({
  allowWildcardSegment = false,
  onChange,
  resourceId,
  selectedSegment,
  singleSegmentSelector = false,
}: UseSegmentFilterProps): {
  renderFilter: (props: RenderFilterProps) => JSX.Element;
} {
  const { orgId } = useParams<{ orgId: string }>();

  const [selectedKey, setSelectedKey] = useState('');

  const commonVariables = {
    orgId: orgId ?? '',
    resourceId,
    tags: selectedSegment,
  };
  const { data: keysData, isLoading: isLoadingKeys } = trpc.meta.segments.listKeys.useQuery(
    { ...commonVariables },
    { enabled: !!resourceId, refetchOnMount: false },
  );
  const { data: valuesData, isLoading: isLoadingValues } = trpc.meta.segments.listValueForKey.useQuery(
    { ...commonVariables, key: selectedKey },
    { enabled: !!selectedKey || !!resourceId },
  );

  const data = useMemo(() => {
    if (!selectedKey && keysData) {
      return keysData.filter(
        (key) => !selectedSegment.find(({ key: segKey }) => key === segKey) || singleSegmentSelector,
      );
    }

    if (selectedKey && valuesData) {
      const allValues = valuesData.map((v) => `${selectedKey}=${v}`);

      if (allowWildcardSegment) return [`${selectedKey}=*`, ...allValues];

      return allValues;
    }
    return [];
  }, [allowWildcardSegment, keysData, selectedKey, selectedSegment, singleSegmentSelector, valuesData]);

  return {
    renderFilter,
  };

  function getEmptyStateMessage() {
    if (!resourceId) return 'Select a resource to view segments';
    if (resourceId && !keysData?.length && !isLoadingKeys) return 'The selected resource has no segments';
    return undefined;
  }

  function renderFilter({ label = 'Filter segments', ...rest }: RenderFilterProps) {
    const isLoading = isLoadingKeys || isLoadingValues;

    if (singleSegmentSelector) {
      return (
        <KeyValueSelect
          data={data}
          isLoading={isLoading}
          emptyState={getEmptyStateMessage()}
          label={label}
          maxDropdownHeight={400}
          onChange={onChange}
          selectedKey={selectedKey}
          setSelectedKey={setSelectedKey}
          selectedPeer={selectedSegment[0]}
          {...rest}
        />
      );
    }

    return (
      <KeyValueMultiSelect
        data={data}
        isLoading={isLoading}
        label={label}
        maxDropdownHeight={400}
        onChange={onChange}
        selectedKey={selectedKey}
        setSelectedKey={setSelectedKey}
        selectedPeers={selectedSegment}
        displayRightButtons={!!selectedSegment?.length && !!data.length}
        {...rest}
      />
    );
  }
}

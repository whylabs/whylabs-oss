import { GenericFlexColumnSelectItemData, SelectorRowText } from '~/components/design-system';
import { RouterInputs, trpc } from '~/utils/trpc';
import { useMemo } from 'react';

import { useOrgId } from '../useOrgId';

type ColumnQueryFilters = RouterInputs['dashboard']['columns']['list']['filter'];

type UseResourceColumnsSelectorDataProps = {
  filter?: ColumnQueryFilters;
  disabledColumns?: string[];
  resourceId: string | null;
};

export const useResourceColumnsSelectorData = ({
  filter,
  disabledColumns,
  resourceId,
}: UseResourceColumnsSelectorDataProps) => {
  const orgId = useOrgId();

  const { data, isLoading } = trpc.dashboard.columns.list.useQuery(
    {
      filter,
      orgId,
      resourceId: resourceId ?? '',
    },
    { enabled: !!resourceId },
  );

  const columnsSelectData: GenericFlexColumnSelectItemData[] = useMemo(() => {
    if (!data) return [];

    return data.map(({ isDiscrete, name }) => ({
      label: name,
      value: name,
      disabled: disabledColumns?.includes(name),
      rows: [
        {
          textElementConstructor: (children) => <SelectorRowText type="label">{children}</SelectorRowText>,
          children: name,
          tooltip: name,
        },
        {
          textElementConstructor: (children) => <SelectorRowText type="secondary">{children}</SelectorRowText>,
          children: isDiscrete ? 'Inferred discrete' : 'Inferred non-discrete',
          tooltip: isDiscrete ? 'Inferred discrete' : 'Inferred non-discrete',
        },
      ],
      usedOnFilter: [name, 'Inferred discrete', 'Inferred non-discrete'],
    }));
  }, [data, disabledColumns]);

  return {
    isLoading: isLoading && !!resourceId,
    columnsSelectData,
    data,
  };
};

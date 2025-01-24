import { GenericFlexColumnSelectItemData, SelectorRowText } from '~/components/design-system';
import { trpc } from '~/utils/trpc';
import { ReactElement, useMemo } from 'react';

import { useOrgId } from '../useOrgId';

type UseResourceProfileMetricsSelectorDataProps = {
  resourceId: string | null;
  skipMonitorMetrics?: boolean;
  skipLlmSecureMetrics?: boolean;
};

export const useResourceProfileMetricsSelectorData = ({
  resourceId,
  skipMonitorMetrics = false,
  skipLlmSecureMetrics = false,
}: UseResourceProfileMetricsSelectorDataProps) => {
  const orgId = useOrgId();

  const { data, isLoading } = trpc.dashboard.metrics.list.useQuery(
    { orgId, resourceId: resourceId ?? '', skipMonitorMetrics, skipLlmSecureMetrics },
    { enabled: !!resourceId },
  );

  const metricsSelectData: GenericFlexColumnSelectItemData[] = useMemo(() => {
    if (!data) return [];

    return (
      data?.map(({ group, label, source, value }) => {
        const metricToDisplay = (() => {
          if (source === 'LLM') return value;
          return `${source}.${group}.${value}`;
        })().toLowerCase();

        const sourceToDisplay = (() => {
          if (source === 'LLM') return 'LLM Secure traces';
          return source;
        })();

        return {
          // value is used as key by default but isn't unique, so we create a custom key to ensure uniqueness
          key: `${group}-${label}-${value}`,
          group,
          label,
          rows: [
            {
              textElementConstructor: (children: ReactElement) => (
                <SelectorRowText type="label">{children}</SelectorRowText>
              ),
              children: label,
              tooltip: label,
            },
            {
              element: <SelectorRowText type="secondary">Metric: {metricToDisplay}</SelectorRowText>,
              tooltip: metricToDisplay,
            },
            {
              textElementConstructor: (children: ReactElement) => (
                <SelectorRowText type="secondary">Source: {children}</SelectorRowText>
              ),
              children: sourceToDisplay,
              tooltip: sourceToDisplay,
            },
          ],
          usedOnFilter: [label, sourceToDisplay],
          value,
        };
      }) ?? []
    );
  }, [data]);

  return {
    isLoading: isLoading && !!resourceId,
    metricsSelectData,
    data,
  };
};

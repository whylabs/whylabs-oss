import { CustomComposedFilters } from '~/components/composed-filter/CustomComposedFilters';
import { TitleValueWidget } from '~/components/header-widgets/TitleValueWidget';
import { useLlmSecureContext } from '~/routes/:orgId/:resourceId/llm-trace/LlmTraceLayout';

import { readableTraceTagNameConverter } from '../../utils/llm-trace-composed-filter-utils';

type LlmTraceCustomFiltersProps = {
  violationTagsOptions: { label: string; value: string }[];
};

export const LlmTraceCustomFilters = ({ violationTagsOptions }: LlmTraceCustomFiltersProps) => {
  const { composedFilterAtom } = useLlmSecureContext();
  return (
    <TitleValueWidget title="Filters" filterId="llmTraceFilter">
      <CustomComposedFilters
        filterId="llmTraceFilter"
        getListFilterOptionsFor={(dimension) => {
          if (dimension === 'violationTags') return violationTagsOptions;
          return [];
        }}
        composedFilterViewModel={composedFilterAtom}
        createListDisplayName={(values) => `any of ${values.length} selected tags`}
        convertListValueToReadableName={readableTraceTagNameConverter}
        maxExpandedItems={2}
      />
    </TitleValueWidget>
  );
};

import { createStyles } from '@mantine/core';
import { WhyLabsMultiSelect, WhyLabsSelect, WhyLabsText } from '~/components/design-system';
import { useMount } from '~/hooks/useMount';
import {
  BEHAVIOR_TYPE_OPTIONS,
  EMBEDDING_TYPE_OPTIONS,
  embeddingsAtom,
  embeddingsFilterAtom,
} from '~/routes/:orgId/:resourceId/llm-trace/embeddings-projector/utils';
import { useLlmTraceViolationTags } from '~/routes/:orgId/:resourceId/llm-trace/hooks/useLlmTraceViolationTags';
import { useLlmSecureContext } from '~/routes/:orgId/:resourceId/llm-trace/LlmTraceLayout';
import { useAtom } from 'jotai';
import { useResetAtom } from 'jotai/utils';
import { useState } from 'react';

const useStyles = createStyles({
  filterSelectWrapper: {
    width: 114,
    minWidth: 114,
  },
  tagsFilterWrapper: {
    minWidth: 200,
    maxWidth: 500,
  },
});
export const EmbeddingsFilters = () => {
  const { classes } = useStyles();
  const [filters, setFilters] = useAtom(embeddingsFilterAtom);
  const resetFilters = useResetAtom(embeddingsFilterAtom);
  const [selectInFocus, setSelectInFocus] = useState(false);
  const resetSelectedEmbeddings = useResetAtom(embeddingsAtom);
  useMount(() => {
    return () => {
      resetFilters();
    };
  });

  const handleSelectChange = (field: 'embeddingType' | 'behaviorType', value: string | null) => {
    resetSelectedEmbeddings();
    setFilters((prev) => {
      return { ...prev, [field]: value };
    });
  };

  const handleViolationTagsChange = (value: string[]) => {
    resetSelectedEmbeddings();
    setFilters((prev) => {
      return { ...prev, tags: value };
    });
  };
  const { resourceId, orgId } = useLlmSecureContext();

  const { data: violationTagsData, isLoading: isLoadingTags } = useLlmTraceViolationTags(orgId, resourceId, true);

  return (
    <>
      <WhyLabsText inherit>Show</WhyLabsText>
      <div className={classes.filterSelectWrapper}>
        <WhyLabsSelect
          label="Embedding type"
          placeholder="All"
          hideLabel
          data={EMBEDDING_TYPE_OPTIONS}
          value={filters.embeddingType}
          onChange={(value) => handleSelectChange('embeddingType', value)}
        />
      </div>
      <WhyLabsText inherit>which have been</WhyLabsText>
      <div className={classes.filterSelectWrapper}>
        <WhyLabsSelect
          label="Behavior type"
          placeholder="Behavior"
          hideLabel
          data={BEHAVIOR_TYPE_OPTIONS}
          value={filters.behaviorType}
          onChange={(value) => handleSelectChange('behaviorType', value)}
        />
      </div>
      <WhyLabsText inherit>with tags</WhyLabsText>
      <div className={classes.tagsFilterWrapper}>
        <WhyLabsMultiSelect
          onFocus={() => setSelectInFocus(true)}
          onBlur={() => setSelectInFocus(false)}
          concatenationToken={{ token: 'OR', position: selectInFocus ? 'afterEach' : 'between' }}
          clearable
          hideLabel
          label="Violation tags"
          data={violationTagsData}
          maxInputHeight={45}
          loading={isLoadingTags}
          onChange={handleViolationTagsChange}
          placeholder="Violation tags"
          value={filters.behaviorType === 'observe' ? [] : filters.tags ?? []}
          disabled={filters.behaviorType === 'observe'}
          disabledTooltip="Observed embeddings has no violations"
        />
      </div>
    </>
  );
};

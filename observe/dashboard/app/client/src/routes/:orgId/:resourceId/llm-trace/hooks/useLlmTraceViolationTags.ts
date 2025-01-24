import { useLlmTraceDateRangeParams } from '~/routes/:orgId/:resourceId/llm-trace/hooks/useLlmTraceDateRangeParams';
import { readableTraceTagNameConverter } from '~/routes/:orgId/:resourceId/llm-trace/utils/llm-trace-composed-filter-utils';
import { upperCaseFirstLetterAndKeepRest } from '~/utils/stringUtils';
import { trpc } from '~/utils/trpc';

export const useLlmTraceViolationTags = (orgId: string, resourceId: string, avoidEmbeddingType?: boolean) => {
  const { isLoading: loadingDateRange, fromTimestamp, toTimestamp } = useLlmTraceDateRangeParams({ orgId, resourceId });
  const commonQuery = { orgId, resourceId };

  const { data: lineageData, isLoading: isLoadingLineage } = trpc.meta.llmTrace.getLineage.useQuery(commonQuery, {
    enabled: !loadingDateRange,
  });

  const { data: violationTagsData, isLoading: isLoadingViolationTags } = trpc.meta.llmTrace.getViolationTags.useQuery(
    {
      ...commonQuery,
      fromTimestamp: lineageData?.start ?? fromTimestamp,
      toTimestamp: lineageData?.end ?? toTimestamp,
    },
    {
      enabled: !loadingDateRange,
    },
  );

  const usedTags = (() => {
    const tags = [
      ...new Set(
        violationTagsData?.map((t) =>
          avoidEmbeddingType ? t.replaceAll(/prompt[.| ]?|response[.| ]?|score[.| ]?/gm, '') : t,
        ),
      ),
    ];
    return tags.map((t) => ({
      value: t,
      label: upperCaseFirstLetterAndKeepRest(readableTraceTagNameConverter(t)),
    }));
  })();

  return {
    data: usedTags ?? [],
    isLoading: isLoadingViolationTags || isLoadingLineage,
  };
};

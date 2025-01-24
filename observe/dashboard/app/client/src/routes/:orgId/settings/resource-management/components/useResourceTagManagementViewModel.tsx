import { NONE_TAGS_GROUP, UserTag } from '~/components/tags/UserDefinedTags';
import { useMutationProperties } from '~/hooks/useMutationProperties';
import { useOrgId } from '~/hooks/useOrgId';
import { RouterOutputs, trpc } from '~/utils/trpc';
import { useCallback, useState } from 'react';
import { useRevalidator } from 'react-router-dom';

type ListTagsReturnType = RouterOutputs['meta']['resources']['listTags'] | undefined;

const MUTATION_RETRY_COUNT = 3;

export const useResourceTagManagementViewModel = () => {
  const orgId = useOrgId();
  const revalidator = useRevalidator();

  const utils = trpc.useUtils();
  const listTagsEndpoint = utils.meta.resources.listTags;

  const [editingTagsId, setEditingTagsId] = useState<string | null>(null);

  const { data: orgTags, isLoading: isLoadingOrgTags } =
    trpc.meta.organizations.listAllOrganizationResourceTags.useQuery({
      orgId,
    });

  const isEnabled = !!editingTagsId;
  const queryVariables = {
    id: editingTagsId ?? '',
    orgId,
  };
  const { data, isLoading } = trpc.meta.resources.listTags.useQuery(queryVariables, {
    enabled: isEnabled,
  });

  /** Cancel any outgoing refetches (so they don't overwrite our optimistic update) */
  const cancelRefetches = listTagsEndpoint.cancel;

  const invalidateAndRefetchQueries = () => {
    listTagsEndpoint.invalidate();
    utils.meta.resourcesSettings.listResources.invalidate();
    utils.meta.organizations.getResourceTagsInUse.invalidate();
  };

  const setListTagsData = (list: ListTagsReturnType | ((old: ListTagsReturnType) => ListTagsReturnType)) => {
    listTagsEndpoint.setData(queryVariables, list);
  };

  const removeTagMutation = trpc.meta.resourcesSettings.removeTag.useMutation({
    onMutate: async (deletedTag) => {
      await cancelRefetches();

      // Snapshot the previous value
      const snapshot = listTagsEndpoint.getData();

      // Optimistically remove the tag
      setListTagsData((prevData) => prevData?.filter((t) => t.key !== deletedTag.key || t.value !== deletedTag.value));

      // Return a context object with the snapshotted value
      return { snapshot };
    },
    onError: (_err, _newTodo, context) => {
      // Rollback to the previous value if mutation fails
      setListTagsData(context?.snapshot);
    },
    onSettled: invalidateAndRefetchQueries,
    retry: MUTATION_RETRY_COUNT,
  });

  const setTagMutation = trpc.meta.resourcesSettings.setTag.useMutation({
    onMutate: async (insertedTag) => {
      await cancelRefetches();

      // Snapshot the previous value
      const snapshot = listTagsEndpoint.getData();

      // Optimistically insert the tag
      setListTagsData((prevData) => {
        if (!prevData) return [insertedTag];
        return [...prevData, insertedTag];
      });

      // Return a context object with the snapshotted value
      return { snapshot };
    },
    onError: (_err, _newTodo, context) => {
      // Rollback to the previous value if mutation fails
      setListTagsData(context?.snapshot);
    },
    onSettled: invalidateAndRefetchQueries,
    retry: MUTATION_RETRY_COUNT,
  });

  const { asyncCall: removeTagAsyncCall } = useMutationProperties({
    mutation: removeTagMutation,
    revalidator,
  });
  const { asyncCall: setTagAsyncCall } = useMutationProperties({
    mutation: setTagMutation,
    revalidator,
  });

  const editResourceTags = useCallback(
    (id: string) => () => {
      // memoized because is a dependency of table cells
      setEditingTagsId(id);
    },
    [setEditingTagsId],
  );

  const cancelEditingTags = () => {
    setEditingTagsId(null);
  };

  const removeTag = ({ customTag }: UserTag) => {
    removeTagAsyncCall({
      id: editingTagsId ?? '',
      orgId,
      key: customTag.key || NONE_TAGS_GROUP,
      value: customTag.value,
    });
  };

  const setTag = ({ customTag: { backgroundColor, color, key, value } }: UserTag) => {
    setTagAsyncCall({
      backgroundColor,
      color,
      id: editingTagsId ?? '',
      orgId,
      key: key || NONE_TAGS_GROUP,
      value,
    });
  };

  const editingResourceTags: UserTag[] = data?.map((customTag) => ({ customTag })) ?? [];

  return {
    cancelEditingTags,
    editResourceTags,
    editingResourceTags,
    isLoadingResource: isLoading,
    isLoadingOrgTags,
    isOpen: !!editingTagsId,
    orgTags: orgTags?.map((t) => ({ customTag: t })) ?? [],
    removeTag,
    setTag,
  };
};

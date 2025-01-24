import { useDebouncedState } from '@mantine/hooks';
import { useOrgId } from '~/hooks/useOrgId';
import { useUserContext } from '~/hooks/useUserContext';
import { useWhyLabsSnackbar } from '~/hooks/useWhyLabsSnackbar';
import { trpc } from '~/utils/trpc';
import { Permission, YamlTagsValidationResponse } from '~server/graphql/generated/graphql';
import { useCallback, useEffect, useState } from 'react';

export type ResourceTaggingDrawerProps = {
  openState: {
    value: boolean;
    setter: (b: boolean) => void;
  };
};
export const useResourceTaggingDrawerViewModel = ({ openState }: ResourceTaggingDrawerProps) => {
  const orgId = useOrgId();
  const { currentUser: user } = useUserContext();
  const { enqueueSnackbar } = useWhyLabsSnackbar();
  const [yamlValidation, setYamlValidation] = useState<YamlTagsValidationResponse | undefined>(undefined);
  const { value: isOpen, setter: setIsOpen } = openState;
  const trpcUtils = trpc.useUtils();
  const { data: yamlContent, isLoading: isLoadingYamlContent } =
    trpc.meta.organizations.getOrganizationCustomTagsYaml.useQuery({ orgId }, { enabled: isOpen });
  const { mutateAsync: validateTagsYaml, isLoading: loadingYamlValidation } =
    trpc.meta.organizations.validateOrganizationCustomTagsYaml.useMutation();
  const { mutateAsync: updateTagsYaml, isLoading: loadingYamlUpdate } =
    trpc.meta.organizations.updateOrganizationCustomTagsYaml.useMutation();

  const [updatedContent, setUpdateContent] = useDebouncedState(yamlContent ?? '', 200, { leading: true });
  useEffect(() => {
    if (isOpen) setUpdateContent(yamlContent ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yamlContent, isOpen]);

  const onChangeYaml = (newValue: string) => setUpdateContent(newValue);

  const onSaveTagsYaml = useCallback(
    async (deleteResourceTags = false) => {
      const validation = await validateTagsYaml({ orgId, yaml: updatedContent });
      if (validation.valid && (!validation.droppedTagsInUse?.length || deleteResourceTags)) {
        const updateStatus = await updateTagsYaml({ orgId, yaml: updatedContent });
        if (updateStatus) {
          setYamlValidation(undefined);
          trpcUtils.meta.organizations.invalidate();
          trpcUtils.meta.resources.listTags.invalidate();
          trpcUtils.meta.resourcesSettings.listResources.invalidate();
          enqueueSnackbar({ title: 'Resource tags updated' });
        } else {
          enqueueSnackbar({ title: "We couldn't update resource tags now. Try again later.", variant: 'error' });
        }
        return;
      }
      setYamlValidation(validation);
    },
    [
      enqueueSnackbar,
      orgId,
      trpcUtils.meta.organizations,
      trpcUtils.meta.resources.listTags,
      trpcUtils.meta.resourcesSettings.listResources,
      updateTagsYaml,
      updatedContent,
      validateTagsYaml,
    ],
  );

  const allowEdit = !!user.permissions?.includes(Permission.ManageOrg);

  const onCancelYamlChanges = useCallback(
    (closeDrawer = true) => {
      if (closeDrawer) setIsOpen(false);
      setYamlValidation(undefined);
    },
    [setIsOpen],
  );

  return {
    orgId,
    user,
    onCancelYamlChanges,
    onSaveTagsYaml,
    yamlContent,
    isLoadingYamlContent,
    loadingYamlValidation,
    loadingYamlUpdate,
    yamlValidation,
    updatedContent,
    onChangeYaml,
    isLoadingMutations: loadingYamlUpdate || loadingYamlValidation,
    allowEdit,
  };
};

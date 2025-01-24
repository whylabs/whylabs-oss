import { UserTag } from '~/components/tags/UserDefinedTags';
import { useDeepCompareEffect } from '~/hooks/useDeepCompareEffect';
import { useMutationProperties } from '~/hooks/useMutationProperties';
import { useOrgId } from '~/hooks/useOrgId';
import { useWhyLabsSnackbar } from '~/hooks/useWhyLabsSnackbar';
import { mapStringToResourceType } from '~/utils/resourceTypeUtils';
import { RESOURCE_ID_QUERY_NAME } from '~/utils/searchParamsConstants';
import { trpc } from '~/utils/trpc';
import { ModelType, TimePeriod } from '~server/graphql/generated/graphql';
import { mapStringToTimePeriod } from '~server/util/time-period-utils';
import LogRocket from 'logrocket';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useRevalidator, useSearchParams } from 'react-router-dom';

import { useResourceManagementIndexViewModel } from '../useResourceManagementIndexViewModel';

const DEFAULT_TYPE = ModelType.Unknown;
const DEFAULT_TIME_PERIOD = TimePeriod.P1D;
const DEFAULT_NAME = '';

type ParentViewModel = ReturnType<typeof useResourceManagementIndexViewModel>;

export type UseAddEditResourceViewModelProps = Pick<
  ParentViewModel,
  'isFreeTier' | 'isOverSubscriptionLimit' | 'refetchResources'
>;

export const useAddEditResourceViewModel = ({
  isFreeTier,
  isOverSubscriptionLimit,
  refetchResources,
}: UseAddEditResourceViewModelProps) => {
  const orgId = useOrgId();
  const revalidator = useRevalidator();
  const { enqueueSnackbar, enqueueErrorSnackbar } = useWhyLabsSnackbar();

  const trpcUtils = trpc.useUtils();

  const [searchParams, setSearchParams] = useSearchParams();
  const resourceId = searchParams.get(RESOURCE_ID_QUERY_NAME) ?? '';

  const isOpen = !!resourceId;
  const isEditing = resourceId !== 'new';

  const isQueryEnabled = isEditing && !!resourceId;
  const { data: resource, isLoading } = trpc.meta.resources.describe.useQuery(
    {
      orgId,
      id: resourceId,
    },
    { enabled: isQueryEnabled },
  );

  const { data: orgTags, isLoading: isLoadingOrgTags } =
    trpc.meta.organizations.listAllOrganizationResourceTags.useQuery({
      orgId,
    });

  const queryVariables = {
    id: resourceId,
    orgId,
  };
  const { data: appliedTags, isLoading: isLoadingAppliedTags } = trpc.meta.resources.listTags.useQuery(queryVariables, {
    enabled: isQueryEnabled,
  });

  const invalidateAndRefetchQueries = () => {
    trpcUtils.meta.resources.listTags.invalidate();
    trpcUtils.meta.resourcesSettings.listResources.invalidate();
    trpcUtils.meta.organizations.getResourceTagsInUse.invalidate();
  };

  const createMutation = trpc.meta.resourcesSettings.createResources.useMutation({
    onSettled: invalidateAndRefetchQueries,
  });
  const updateMutation = trpc.meta.resourcesSettings.updateResource.useMutation({
    onSettled: invalidateAndRefetchQueries,
  });

  const createMutationProperties = useMutationProperties({ mutation: createMutation, revalidator });
  const updateMutationProperties = useMutationProperties({ mutation: updateMutation, revalidator });

  // Store initial values to check if the form is dirty
  const initialValuesRef = useRef({
    name: DEFAULT_NAME,
    timePeriod: DEFAULT_TIME_PERIOD,
    type: DEFAULT_TYPE,
  });

  const [resourceName, setResourceName] = useState(initialValuesRef.current.name);
  const [timePeriod, setResourceTimePeriod] = useState<TimePeriod>(initialValuesRef.current.timePeriod);
  const [tags, setTags] = useState<UserTag[]>([]);
  const [resourceType, setResourceType] = useState<ModelType>(initialValuesRef.current.type);

  const notFoundResource = isEditing && !isLoading && !resource;

  const resetForm = useCallback(() => {
    setResourceName(DEFAULT_NAME);
    setResourceType(DEFAULT_TYPE);
    setTags([]);
    setResourceTimePeriod(DEFAULT_TIME_PERIOD);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen, resetForm]);

  // Set form values when resource is fetched
  useDeepCompareEffect(() => {
    if (isEditing && resource) {
      const newName = resource.name ?? DEFAULT_NAME;
      setResourceName(newName);

      const newTimePeriod: TimePeriod = (() => {
        if (resource?.timePeriod) {
          return mapStringToTimePeriod.get(resource.timePeriod) ?? DEFAULT_TIME_PERIOD;
        }
        return DEFAULT_TIME_PERIOD;
      })();
      setResourceTimePeriod(newTimePeriod);

      const newType: ModelType = (() => {
        if (resource?.modelType) {
          return mapStringToResourceType.get(resource.modelType) ?? DEFAULT_TYPE;
        }
        return DEFAULT_TYPE;
      })();
      setResourceType(newType);

      // Update the initial values to check if the form is dirty
      initialValuesRef.current = {
        name: newName,
        timePeriod: newTimePeriod,
        type: newType,
      };
    }
  }, [isEditing, resource]);

  useDeepCompareEffect(() => {
    if (isEditing && appliedTags) {
      setTags(appliedTags.map((tag) => ({ customTag: tag })));
    }
  }, [appliedTags, isEditing]);

  const onChangeName = (newName: string) => {
    setResourceName(newName);
  };

  const onChangeTimePeriod = (newTypePeriod: TimePeriod) => {
    setResourceTimePeriod(newTypePeriod);
  };

  const onChangeTags = (newTagsList: UserTag[]) => {
    setTags(newTagsList);
  };

  const onChangeType = (newType: ModelType) => {
    setResourceType(newType);
  };

  const onClose = () => {
    setSearchParams((nextSearchParams) => {
      nextSearchParams.delete(RESOURCE_ID_QUERY_NAME);
      return nextSearchParams;
    });
  };

  const commonMutationPayload = {
    name: resourceName,
    orgId,
    tags: tags.map((t) => t.customTag),
    timePeriod,
    type: resourceType,
  };

  const createResource = async () => {
    try {
      await createMutationProperties.asyncCall({
        ...commonMutationPayload,
      });
      enqueueSnackbar({ title: 'Added new resource' });
    } catch (err) {
      const explanation = 'Resource creation failed';
      LogRocket.error(explanation, err);
      enqueueErrorSnackbar({ explanation, err });
    }
  };

  const updateResource = async () => {
    if (!resource) return;

    try {
      await updateMutationProperties.asyncCall({
        id: resource.id,
        ...commonMutationPayload,
      });
      enqueueSnackbar({ title: 'Resource updated' });
    } catch (err) {
      const explanation = 'Resource update failed';
      LogRocket.error(explanation, err);
      enqueueErrorSnackbar({ explanation, err });
    }
  };

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    (async () => {
      const mutationFn = isEditing ? updateResource : createResource;
      await mutationFn();

      refetchResources();
      onClose();
      resetForm();
    })();
  }

  const isDirty = (() => {
    const initialValues = initialValuesRef.current;
    // Check if any of the values are different from the initial values
    const isNameDifferent = initialValues.name !== resourceName;
    const isTimePeriodDifferent = initialValues.timePeriod !== timePeriod;
    const isTypeDifferent = initialValues.type !== resourceType;

    return isNameDifferent || isTimePeriodDifferent || isTypeDifferent;
  })();

  const isFormDisabled = !resourceName.length;
  const isLoadingTags = (isQueryEnabled && isLoadingAppliedTags) || isLoadingOrgTags;
  const isSaving = createMutationProperties.isSaving || updateMutationProperties.isSaving;
  const isTimePeriodDisabled = isFreeTier || isOverSubscriptionLimit;

  return {
    isDirty,
    isFormDisabled,
    isEditing,
    isLoading: isQueryEnabled && isLoading,
    isLoadingTags,
    isOpen,
    isSaving,
    isTimePeriodDisabled,
    onClose,
    onChangeName,
    onChangeTimePeriod,
    onChangeTags,
    onChangeType,
    onSubmit,
    orgTags: orgTags?.map((t) => ({ customTag: t })) ?? [],
    notFoundResource,
    resourceName,
    resourceType,
    resourceId,
    tags,
    timePeriod,
  };
};

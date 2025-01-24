import { useDeepCompareEffect } from '~/hooks/useDeepCompareEffect';
import { useFlags } from '~/hooks/useFlags';
import { useOrgId } from '~/hooks/useOrgId';
import { useUserContext } from '~/hooks/useUserContext';
import { useNavLinkHandler } from '~/hooks/useWhylabsNavigation';
import { useWhyLabsSnackbar } from '~/hooks/useWhyLabsSnackbar';
import { NullableString } from '~/types/genericTypes';
import { getUTCEndOfDay } from '~/utils/dateUtils';
import { canManageTokens } from '~/utils/permissionUtils';
import { getLabelForModelType } from '~/utils/resourceTypeUtils';
import { EDITING_KEY } from '~/utils/searchParamsConstants';
import { RouterInputs, trpc } from '~/utils/trpc';
import { ModelType } from '~server/graphql/generated/graphql';
import LogRocket from 'logrocket';
import qs from 'query-string';
import { useState } from 'react';
import { useLocation } from 'react-router-dom';

import { useGetCodeExamples } from '../hooks/useGetCodeExamples';

export const INSTALL_COMMAND = `pip install -q 'whylogs'`;

type MutationInputType = RouterInputs['meta']['apiKeys']['createApiKey'];

export const useQuickStartViewModel = () => {
  const { getNavUrl } = useNavLinkHandler();
  const orgId = useOrgId();
  const flags = useFlags();
  const { enqueueSnackbar, enqueueErrorSnackbar } = useWhyLabsSnackbar();
  const { currentUser: user } = useUserContext();
  const { search } = useLocation();
  const userCanManageTokens = canManageTokens(user);

  const [selectedResourceId, setSelectedResourceId] = useState<NullableString>(null);
  const [exampleLanguageIndex, setLanguageIndex] = useState(0);
  const [createdAccessToken, setCreatedAccessToken] = useState<string | null>(null);
  const [exampleLibIndex, setLibIndex] = useState(0);

  const { data, isLoading } = trpc.meta.resources.list.useQuery({ orgId, withAvailability: true });
  const createApiKeyMutation = trpc.meta.apiKeys.createApiKey.useMutation();

  const resourceOptions = (() => {
    if (!data) return [];

    return data.map((model) => ({
      label: `${model.name} (${model.id})`,
      value: model.id,
      type: model.modelType,
    }));
  })();

  const selectedResource = resourceOptions.find((o) => o.value === selectedResourceId);
  const profilesFetched = data && !!data.find((r) => r.id === selectedResourceId)?.dataAvailability?.hasData;

  const examples = useGetCodeExamples({
    orgId,
    modelId: selectedResourceId ?? undefined,
    accessToken: createdAccessToken ?? undefined,
    modelName: selectedResource?.label.toString(),
  });
  const { children, language } = examples[exampleLanguageIndex];
  const { code } = children[exampleLibIndex];

  const searchObj = qs.parse(search);
  const resourceIdFromQueryString = typeof searchObj[EDITING_KEY] === 'string' ? searchObj[EDITING_KEY] : null;

  useDeepCompareEffect(() => {
    if (selectedResourceId) return;

    let resourceIdToSelect = resourceOptions?.[0]?.value || null;
    if (resourceIdFromQueryString && resourceOptions.find((r) => r.value === resourceIdFromQueryString)) {
      resourceIdToSelect = resourceIdFromQueryString;
    }

    if (resourceIdToSelect) {
      setSelectedResourceId(resourceIdToSelect);
    }
  }, [resourceOptions, resourceIdFromQueryString, selectedResourceId]);

  const resourceType =
    selectedResource?.type && selectedResource.type !== ModelType.Unknown
      ? getLabelForModelType(selectedResource.type as ModelType) || 'resource'
      : 'resource';

  const exampleOptions = (() => {
    const list: { label: string; value: string }[] = [];

    examples.forEach((lang, languageIndex) => {
      lang.children.forEach((lib, libIndex) => {
        list.push({
          label: `${lang.label} / ${lib.label}`,
          value: `${languageIndex}_${libIndex}`,
        });
      });
    });

    return list;
  })();

  const onChangeExample = (indexString: string) => {
    const [languageIndex, libIndex] = indexString.split('_');
    setLanguageIndex(parseInt(languageIndex, 10));
    setLibIndex(parseInt(libIndex, 10));
  };

  const onCopy = () => {
    if (!createdAccessToken) return;
    navigator.clipboard.writeText(createdAccessToken).then(() =>
      enqueueSnackbar({
        title: 'Token copied to clipboard!',
      }),
    );
  };

  const onSubmitNewToken = () => {
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    const endOfExpirationDay = getUTCEndOfDay(oneYearFromNow).getTime();

    const canManageAccount = !!flags.accountManagement;
    const scopes: MutationInputType['scopes'] = canManageAccount ? ['ACCOUNT_ADMIN', 'USER'] : ['USER'];

    createApiKeyMutation
      .mutateAsync({
        expirationTime: endOfExpirationDay,
        orgId,
        scopes,
        tokenName: `${user.name}-API-token`,
      })
      .then((res) => {
        setCreatedAccessToken(res ?? null);
        enqueueSnackbar({ title: 'Token created!' });
      })
      .catch((err) => {
        LogRocket.error(`Creating access token failed ${err}`);
        enqueueErrorSnackbar({
          explanation: 'Token creation failed',
          err,
        });
      });
  };

  return {
    code,
    createdAccessToken,
    exampleLanguageIndex,
    exampleLibIndex,
    exampleOptions,
    getNavUrl,
    isLoading,
    language,
    onChangeExample,
    onCopy,
    onSubmitNewToken,
    orgId,
    profilesFetched,
    resourceOptions,
    resourceType,
    selectedResource,
    selectedResourceId,
    setSelectedResourceId,
    userCanManageTokens,
  };
};

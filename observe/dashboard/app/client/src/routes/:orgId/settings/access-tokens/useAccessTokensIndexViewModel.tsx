import { useFlags } from '~/hooks/useFlags';
import { useMutationProperties } from '~/hooks/useMutationProperties';
import { useOrganizationsList } from '~/hooks/useOrganizationsList';
import useSort from '~/hooks/useSort';
import { useWhyLabsSnackbar } from '~/hooks/useWhyLabsSnackbar';
import { SortByKeys, SortDirection, SortDirectionKeys } from '~/types/sortTypes';
import { getUTCEndOfDay } from '~/utils/dateUtils';
import { RouterInputs, trpc } from '~/utils/trpc';
import { ApiKeysOrderByEnum } from '~server/trpc/meta/api-keys/types/apiKeysTypes';
import LogRocket from 'logrocket';
import { useState } from 'react';
import { useRevalidator } from 'react-router-dom';

type MutationInputType = RouterInputs['meta']['apiKeys']['createApiKey'];

export const useAccessTokensIndexViewModel = () => {
  const { sortBy, sortDirection, setSort } = useSort<ApiKeysOrderByEnum>({
    defaultSortBy: ApiKeysOrderByEnum.CreationTime,
    defaultSortDirection: SortDirection.Desc,
    sortByKey: SortByKeys.sortApiKeysBy,
    sortDirectionKey: SortDirectionKeys.sortApiKeysDirection,
  });

  const { orgId } = useOrganizationsList();

  const flags = useFlags();
  const { enqueueSnackbar, enqueueErrorSnackbar } = useWhyLabsSnackbar();
  const revalidator = useRevalidator();

  const [createdAccessToken, setCreatedAccessToken] = useState<string | null>(null);

  const {
    data: accessTokens,
    isLoading,
    refetch,
  } = trpc.meta.apiKeys.listApiKeys.useQuery({ orgId, sortBy, sortDirection });

  const mutation = trpc.meta.apiKeys.createApiKey.useMutation();
  const revokeKeyMutation = trpc.meta.apiKeys.revokeApiKey.useMutation();
  const { asyncCall, isSaving } = useMutationProperties({ mutation, revalidator });
  const { asyncCall: revokeKeyMutationAsyncCall } = useMutationProperties({ mutation: revokeKeyMutation, revalidator });

  const canManageAccount = !!flags.accountManagement;

  const generateAccessToken = async (tokenName: string, expiresAt: Date | null) => {
    try {
      const endOfExpirationDay = expiresAt ? getUTCEndOfDay(expiresAt).getTime() : undefined;
      const scopes: MutationInputType['scopes'] = canManageAccount ? ['ACCOUNT_ADMIN', 'USER'] : ['USER'];

      const secret = await asyncCall({
        expirationTime: endOfExpirationDay,
        orgId,
        scopes,
        tokenName,
      });
      setCreatedAccessToken(secret ?? null);

      // Refetch access tokens
      refetch();

      return true;
    } catch (error) {
      LogRocket.error(`Creating access token failed`, error);
      enqueueSnackbar({ title: 'Token creation failed', variant: 'error' });
    }

    return false;
  };

  const revokeAccessToken = (keyId: string, userId: string) => {
    (async () => {
      try {
        await revokeKeyMutationAsyncCall({ orgId, keyId, userId });

        // Clear the created access token if it was revoked
        if (createdAccessToken?.includes(keyId)) {
          setCreatedAccessToken(null);
        }

        enqueueSnackbar({
          title: 'Access token successfully revoked',
        });

        await refetch();
      } catch (err) {
        enqueueErrorSnackbar({
          explanation: 'Access token revoke failed.',
          err,
        });
      }
    })();
  };

  return {
    accessTokens: accessTokens ?? [],
    canManageAccount,
    createdAccessToken,
    generateAccessToken,
    isLoading,
    isSaving,
    revokeAccessToken,
    setSort,
    sortBy,
    sortDirection,
  };
};

import { TRPCClientError } from '@trpc/client';
import { UseTRPCMutationResult } from '@trpc/react-query/dist/shared';
import { tryToGetTrpcInputValidationErrors } from '~/utils/trpcClientUtils';
import { useRevalidator } from 'react-router-dom';

import { useWhyLabsSnackbar } from './useWhyLabsSnackbar';

type RevalidatorType = Pick<ReturnType<typeof useRevalidator>, 'state'>;

// Using 'any' because we don't need the mutation specific type here, just some generic properties

type GenericMutationType<TData, TError, TVariables, TContext> = Pick<
  UseTRPCMutationResult<TData, TError, TVariables, TContext>,
  'isLoading' | 'mutateAsync'
>;

export type UseMutationPropertiesProps<TData, TError, TVariables, TContext> = {
  mutation: GenericMutationType<TData, TError, TVariables, TContext>;
  revalidator: RevalidatorType;
};

type AsyncMutationCallOptions = {
  onErrorExplanation?: (message: string) => string;
};

export const useMutationProperties = <TData, TError, TVariables, TContext>({
  mutation,
  revalidator,
}: UseMutationPropertiesProps<TData, TError, TVariables, TContext>) => {
  const { enqueueErrorSnackbar } = useWhyLabsSnackbar();

  const isSaving = mutation.isLoading || revalidator.state === 'loading';

  const asyncCall = async (
    variables: TVariables,
    { onErrorExplanation }: AsyncMutationCallOptions = {},
  ): Promise<TData | null> => {
    try {
      return await mutation.mutateAsync(variables);
    } catch (err) {
      const displayTheErrorMessage = (message: string) => {
        const explanation = onErrorExplanation?.(message) || message;
        enqueueErrorSnackbar({ explanation, err });
      };

      if (err instanceof TRPCClientError) {
        const { message } = err;

        // Special handling for TRPC input validation errors
        const validationErrors = tryToGetTrpcInputValidationErrors(message);
        if (validationErrors.length) {
          validationErrors.forEach(displayTheErrorMessage);
          return null;
        }

        displayTheErrorMessage(message);
      } else {
        displayTheErrorMessage('Unknown mutation error');
      }
    }
    return null;
  };

  return { isSaving, asyncCall };
};

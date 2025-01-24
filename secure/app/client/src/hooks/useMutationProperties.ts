import { UseTRPCMutationResult } from '@trpc/react-query/dist/shared';
import { useRevalidator } from 'react-router-dom';

type RevalidatorType = Pick<ReturnType<typeof useRevalidator>, 'state'>;

// Using 'any' because we don't need the mutation specific type here, just some generic properties
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GenericMutationType = Pick<UseTRPCMutationResult<any, any, any, any>, 'isLoading'>;

export type UseMutationPropertiesProps = {
  mutation: GenericMutationType;
  revalidator: RevalidatorType;
};

export const useMutationProperties = ({ mutation, revalidator }: UseMutationPropertiesProps) => {
  const isSaving = mutation.isLoading || revalidator.state === 'loading';

  return { isSaving };
};

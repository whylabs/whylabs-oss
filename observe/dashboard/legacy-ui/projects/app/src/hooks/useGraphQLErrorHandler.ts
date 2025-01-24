import { useEffect } from 'react';
import { ApolloError } from '@apollo/client';
import { useWhyLabsSnackbar } from './useWhyLabsSnackbar';

export const useGraphQLErrorHandler = (error: ApolloError | null | undefined): void => {
  const { enqueueErrorSnackbar } = useWhyLabsSnackbar();
  useEffect(() => {
    if (error) {
      const explanation = (() => {
        if (error?.message?.includes('time range is too wide')) {
          return error.message;
        }
        return 'Something went wrong, please try again later.';
      })();
      enqueueErrorSnackbar({ err: error, explanation });
    }
  }, [enqueueErrorSnackbar, error]);
};

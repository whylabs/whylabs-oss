import { useEffect } from 'react';
import { useWhyLabsSnackbar } from '~/hooks/useWhyLabsSnackbar';
/* eslint-disable react-hooks/exhaustive-deps */

type ErrorObject = {
  message?: string;
};
export const useTrpcServerErrorHandler = (error: ErrorObject | null | undefined): void => {
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
  }, [error]);
};

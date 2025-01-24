import { notifications } from '@mantine/notifications';
import { IconCircleX, IconCircleCheck, IconAlertTriangle } from '@tabler/icons';
import { Colors } from '@whylabs/observatory-lib';
import { createStyles } from '@mantine/core';
import { ReactNode, useCallback } from 'react';
import { ApolloError } from '@apollo/client';
import { useDeepCompareCallback } from 'use-deep-compare';
import { getDashbirdErrors } from '../utils/error-utils';
import { isNotNullish } from '../utils/nullUtils';

type ErrorSnackbarArgs = {
  explanation: string; // generic explanation for the error. Will be followed by safe backend messages (if any)
  err: unknown; // Error that was caught. If there are any Dashbird errors contained in it, their messages will be included in the snackbar
  autoClose?: number | boolean;
};

export type NotificationProps = {
  id?: string;
  title: ReactNode;
  description?: string;
  variant?: 'info' | 'success' | 'error' | 'warning';
  autoClose?: number | boolean;
};

type WhyLabsNotificationReturnType = {
  enqueueSnackbar: (props: NotificationProps) => void;
  enqueueErrorSnackbar: (props: ErrorSnackbarArgs) => void;
  cleanQueue: () => void;
};

const useStyles = createStyles({
  title: {
    fontFamily: 'Asap',
    fontWeight: 500,
    fontSize: 14,
    color: Colors.gray900,
  },
  description: {
    fontFamily: 'Asap',
    fontWeight: 400,
    fontSize: 12,
    color: Colors.brandSecondary600,
  },
});

const stylesMapper = new Map<NotificationProps['variant'], { icon?: ReactNode; color?: string }>([
  ['info', { color: Colors.chartBlue }],
  ['success', { icon: <IconCircleCheck size="1.75rem" color={Colors.teal} /> }],
  ['warning', { icon: <IconAlertTriangle size="1.75rem" color={Colors.yellow} /> }],
  ['error', { icon: <IconCircleX size="1.75rem" color={Colors.red} /> }],
]);
export const useWhyLabsSnackbar = (): WhyLabsNotificationReturnType => {
  const { classes } = useStyles();

  const enqueueSnackbar = useDeepCompareCallback(
    ({ description, variant = 'success', ...rest }: NotificationProps): void => {
      const { icon, color } = stylesMapper?.get(variant) ?? {};
      notifications.show({
        ...rest,
        message: description,
        withBorder: true,
        withCloseButton: true,
        icon,
        classNames: classes,
        styles: () => ({
          root: {
            '&::before': {
              backgroundColor: color,
            },
          },
          icon: {
            backgroundColor: 'unset',
          },
        }),
        closeButtonProps: { 'aria-label': 'Hide notification' },
      });
    },
    [classes],
  );

  const enqueueErrorSnackbar = useCallback(
    ({ explanation, err, autoClose }: ErrorSnackbarArgs) => {
      const dashbirdErrors = getDashbirdErrors(err);
      if (dashbirdErrors.length) {
        const firstError = dashbirdErrors.slice().shift();
        // special case for authorization errors
        if (firstError?.extensions?.code === 'AUTHORIZATION_ERROR') {
          return enqueueSnackbar({ title: firstError?.extensions?.safeErrorMsg, variant: 'warning' });
        }

        const firstSafeMsg = firstError?.extensions?.safeErrorMsg;
        return enqueueSnackbar({
          title: `${explanation}`,
          description: explanation !== firstSafeMsg ? firstSafeMsg : undefined,
          variant: 'error',
          autoClose,
        });
      }

      return enqueueSnackbar({ title: explanation, variant: 'error' });
    },
    [enqueueSnackbar],
  );

  return {
    enqueueSnackbar,
    enqueueErrorSnackbar,
    cleanQueue: notifications.cleanQueue,
  };
};

type ErrorHandler = (err: ApolloError) => void;

/**
 * Handles an array of possible Apollo errors. Runs the default error handler if no custom handler was specified.
 * @param possibleErrors Array of Apollo errors to process
 * @param message A message to provide contextual info with the errors
 * @param errorHandler What to do for each error. This hook defines default behavior if no handler was specified.
 */
export const useHandlePossibleApolloErrors = (
  possibleErrors: (ApolloError | undefined)[],
  message = 'Something went wrong',
  errorHandler?: ErrorHandler,
): void => {
  // we only care about defined errors
  const filteredErrors = possibleErrors.filter(isNotNullish);

  const { enqueueErrorSnackbar } = useWhyLabsSnackbar();

  if (!filteredErrors.length) {
    // nothing to do
    return;
  }

  // by default, log the error and pop up the error snackbar
  const defaultErrorHandler: ErrorHandler = (err) => {
    if (err) {
      console.error(err);
      enqueueErrorSnackbar({ explanation: message, err });
    }
  };

  const handler = errorHandler ?? defaultErrorHandler;

  filteredErrors.forEach(handler);
};

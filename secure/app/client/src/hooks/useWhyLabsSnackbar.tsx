import { notifications } from '@mantine/notifications';
import { IconAlertTriangle, IconCircleCheck, IconCircleX } from '@tabler/icons-react';
import { ReactNode, useCallback } from 'react';
import { Colors } from '~/assets/Colors';

import { getDashbirdErrors } from '../utils/error-utils';

type ErrorSnackbarArgs = {
  explanation: string; // generic explanation for the error. Will be followed by safe backend messages (if any)
  err: unknown; // Error that was caught. If there are any Dashbird errors contained in it, their messages will be included in the snackbar
};

type NotificationProps = {
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

const stylesMapper = new Map<NotificationProps['variant'], { icon?: ReactNode; color?: string }>([
  ['info', { color: Colors.chartBlue }],
  ['success', { icon: <IconCircleCheck size="1.75rem" color={Colors.teal} /> }],
  ['warning', { icon: <IconAlertTriangle size="1.75rem" color={Colors.yellow} /> }],
  ['error', { icon: <IconCircleX size="1.75rem" color={Colors.red} /> }],
]);
export const useWhyLabsSnackbar = (): WhyLabsNotificationReturnType => {
  const enqueueSnackbar = useCallback(({ description, variant = 'success', ...rest }: NotificationProps): void => {
    const { icon, color } = stylesMapper?.get(variant) ?? {};
    notifications.show({
      ...rest,
      message: description,
      withBorder: false,
      withCloseButton: true,
      icon,
      styles: () => ({
        root: {
          '&::before': {
            backgroundColor: color,
          },
        },
        icon: {
          backgroundColor: 'unset',
        },
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
      }),
      closeButtonProps: { 'aria-label': 'Hide notification' },
    });
  }, []);

  const enqueueErrorSnackbar = useCallback(
    ({ explanation, err }: ErrorSnackbarArgs) => {
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
          description: firstSafeMsg ?? 'unknown error',
          variant: 'error',
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

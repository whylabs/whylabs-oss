import { createStyles } from '@mantine/core';
import { WhyLabsButton } from '~/components/design-system';
import { useWhyLabsSnackbar } from '~/hooks/useWhyLabsSnackbar';

const useStyles = createStyles(() => ({
  root: {
    display: 'flex',
    flexDirection: 'row',
    gap: 10,
    padding: 20,
  },
}));

export const ToastMessage = () => {
  const { classes } = useStyles();
  const { enqueueSnackbar, enqueueErrorSnackbar } = useWhyLabsSnackbar();

  return (
    <div className={classes.root}>
      <WhyLabsButton
        onClick={() => {
          enqueueSnackbar({ title: 'Info toast message', variant: 'info' });
        }}
        variant="outline"
      >
        Display Info toast
      </WhyLabsButton>
      <WhyLabsButton
        color="danger"
        onClick={() => {
          enqueueErrorSnackbar({ explanation: 'Error toast message', err: new Error() });
        }}
        variant="outline"
      >
        Display Error toast
      </WhyLabsButton>
      <WhyLabsButton
        color="success"
        onClick={() => {
          enqueueSnackbar({ title: 'Success toast message' });
        }}
        variant="filled"
      >
        Display Success toast
      </WhyLabsButton>
      <WhyLabsButton
        onClick={() => {
          enqueueSnackbar({ title: 'Warning toast message', variant: 'warning' });
        }}
        variant="outline"
      >
        Display Warning toast
      </WhyLabsButton>
    </div>
  );
};

import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';

import { WhyLabsButton, WhyLabsSubmitButton } from './design-system';
import { WhyLabsButtonProps } from './design-system/button/WhyLabsButton';

const useStyles = createStyles(() => ({
  bottomToolbar: {
    background: Colors.white,
    borderTop: `1px solid ${Colors.secondaryLight200}`,
    boxShadow: '0px 2px 10px 0px rgba(0, 0, 0, 0.50)',
    display: 'flex',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
    padding: 15,
  },
}));

type CommonButtonProps = Pick<WhyLabsButtonProps, 'disabled' | 'disabledTooltip' | 'onClick'>;

type CancelButton = CommonButtonProps & {
  label?: string;
};

type SubmitButton = CommonButtonProps &
  Pick<WhyLabsButtonProps, 'formId' | 'loading' | 'disabled'> & {
    label?: string;
  };

type ActionsBottomBarProps = {
  cancelButtonProps: CancelButton;
  className?: string;
  submitButtonProps: SubmitButton;
};

export const ActionsBottomBar = ({ cancelButtonProps, className, submitButtonProps }: ActionsBottomBarProps) => {
  const { classes, cx } = useStyles();

  const cancelButtonElement = (() => {
    const { label = 'Cancel', ...rest } = cancelButtonProps;
    return (
      <WhyLabsButton color="gray" variant="outline" {...rest}>
        {label}
      </WhyLabsButton>
    );
  })();

  const submitButtonElement = (() => {
    const { label = 'Save', ...rest } = submitButtonProps;
    return <WhyLabsSubmitButton {...rest}>{label}</WhyLabsSubmitButton>;
  })();

  return (
    <div className={cx(classes.bottomToolbar, className)} data-testid="ActionsBottomBar">
      {cancelButtonElement}
      {submitButtonElement}
    </div>
  );
};

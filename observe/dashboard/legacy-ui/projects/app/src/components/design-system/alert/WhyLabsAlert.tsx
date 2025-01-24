import { Alert, AlertProps, createStyles } from '@mantine/core';
import { useState } from 'react';
import { Colors } from '@whylabs/observatory-lib';

interface StyleProps {
  backgroundColor: string;
  showAlert: boolean;
}

const useStyles = createStyles((_, { backgroundColor, showAlert }: StyleProps) => ({
  root: {
    boxSizing: 'border-box',
    overflow: 'visible',
    width: '100%',
    padding: '10px',
    backgroundColor,
    opacity: Number(showAlert),
    transition: 'opacity 300ms ease',
  },
  label: {
    width: '100%',
    fontWeight: 500,
  },
}));

export type WhyLabsAlertProps = Pick<AlertProps, 'className' | 'icon' | 'title' | 'onClose' | 'color'> & {
  backgroundColor?: string;
  dismissible?: boolean;
  padding?: number | string;
  children?: React.ReactNode;
};

const WhyLabsAlert = ({
  children,
  backgroundColor = Colors.brandSecondary200,
  dismissible,
  padding = 0,
  ...rest
}: WhyLabsAlertProps): JSX.Element => {
  const [showAlert, setShowAlert] = useState(true);
  const [hideElement, setHideElement] = useState(false);
  const {
    classes: { root, label },
  } = useStyles({ backgroundColor, showAlert });

  const dismiss = () => {
    setShowAlert(false);
    setTimeout(() => setHideElement(true), 300);
  };
  if (hideElement) return <></>;
  return (
    <div style={{ padding }}>
      <Alert
        classNames={{ root, label }}
        data-testid="WhyLabsAlert"
        onClose={dismiss}
        {...rest}
        radius="sm"
        variant="light"
        withCloseButton={dismissible}
        closeButtonLabel="Close alert"
        styles={{ title: { marginBottom: children ? '10px' : '0px' } }}
      >
        {children}
      </Alert>
    </div>
  );
};

export default WhyLabsAlert;

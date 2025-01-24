import { CloseButton, CloseButtonProps } from '@mantine/core';

export const CLOSE_BUTTON_DEFAULT_PROPS: CloseButtonProps = {
  size: 'md',
  iconSize: 20,
  variant: 'outline',
};

type WhyLabsCloseButtonProps = {
  label: string;
  onClick: () => void;
} & Pick<CloseButtonProps, 'id' | 'size' | 'variant' | 'iconSize'>;

export const WhyLabsCloseButton = ({ label, ...rest }: WhyLabsCloseButtonProps) => {
  return <CloseButton aria-label={label} title={label} {...CLOSE_BUTTON_DEFAULT_PROPS} {...rest} />;
};

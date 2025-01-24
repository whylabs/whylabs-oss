import { LoadingOverlay, LoadingOverlayProps } from '@mantine/core';

export type WhyLabsLoadingOverlayProps = Pick<LoadingOverlayProps, 'visible' | 'overlayBlur' | 'overlayOpacity'>;

const WhyLabsLoadingOverlay = ({ visible, overlayBlur, overlayOpacity }: WhyLabsLoadingOverlayProps) => {
  return (
    <LoadingOverlay
      data-testid="WhyLabsLoadingOverlay"
      overlayBlur={overlayBlur ?? 1}
      overlayOpacity={overlayOpacity}
      transitionDuration={300}
      visible={visible}
      zIndex={100}
    />
  );
};

export default WhyLabsLoadingOverlay;

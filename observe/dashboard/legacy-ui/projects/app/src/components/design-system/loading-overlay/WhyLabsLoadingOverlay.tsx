import { LoadingOverlay } from '@mantine/core';

export type WhyLabsLoadingOverlayProps = {
  visible: boolean;
};

const WhyLabsLoadingOverlay: React.FC<WhyLabsLoadingOverlayProps> = ({ visible }) => {
  return (
    <LoadingOverlay data-testid="WhyLabsLoadingOverlay" visible={visible} overlayBlur={1} transitionDuration={300} />
  );
};

export default WhyLabsLoadingOverlay;

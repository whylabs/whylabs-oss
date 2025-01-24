import { Space, SpaceProps } from '@mantine/core';

type WhyLabsSpaceProps = {
  className?: string;
  height?: SpaceProps['h'];
  width?: SpaceProps['w'];
};

const WhyLabsSpace = ({ className, height = 'md', width = 'md' }: WhyLabsSpaceProps): JSX.Element => {
  return <Space className={className} h={height} w={width} />;
};

export default WhyLabsSpace;

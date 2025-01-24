import { Progress, ProgressProps } from '@mantine/core';
import { FC } from 'react';

export type WhyLabsProgressBarProps = Pick<ProgressProps, 'value' | 'size'> & {
  bottomText?: JSX.Element;
};

const WhyLabsProgressBar: FC<WhyLabsProgressBarProps> = ({ bottomText, size = 'lg', ...rest }) => {
  return (
    <div>
      <Progress {...rest} size={size} radius="xs" striped animate data-testid="WhyLabsProgressBar" />
      {bottomText}
    </div>
  );
};

export default WhyLabsProgressBar;

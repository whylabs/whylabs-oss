import { WhyLabsButton } from '~/components/design-system';
import { JSX } from 'react';

export const WhyLabsButtonPlayground = (): JSX.Element => {
  return (
    <>
      <WhyLabsButton variant="filled">Filled button</WhyLabsButton>
      <WhyLabsButton variant="outline">Outlined button</WhyLabsButton>
      <WhyLabsButton variant="subtle">Subtle button</WhyLabsButton>
    </>
  );
};

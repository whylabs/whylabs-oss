import { Title, TitleOrder, TitleProps } from '@mantine/core';
import { JSX } from 'react';

export type WhyLabsTitleProps = Pick<TitleProps, 'className' | 'style' | 'children'> & {
  element?: 'h1' | 'h2' | 'h3' | 'h4';
};

const WhyLabsTitle = ({ children, element, ...rest }: WhyLabsTitleProps): JSX.Element => {
  return (
    <Title data-testid="WhyLabsTitle" {...rest} order={getOrder()}>
      {children}
    </Title>
  );

  function getOrder(): TitleOrder {
    switch (element) {
      case 'h2':
        return 2;
      case 'h3':
        return 3;
      case 'h4':
        return 4;
      case 'h1':
      default:
        return 1;
    }
  }
};

export default WhyLabsTitle;

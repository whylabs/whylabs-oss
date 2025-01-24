import { Title, TitleProps } from '@mantine/core';

export type WhyLabsTypographyProps = Pick<TitleProps, 'className' | 'style' | 'children' | 'order'>;

const WhyLabsTypography: React.FC<WhyLabsTypographyProps> = ({ children, ...rest }) => {
  return (
    <Title data-testid="WhyLabsTypography" {...rest}>
      {children}
    </Title>
  );
};

export default WhyLabsTypography;

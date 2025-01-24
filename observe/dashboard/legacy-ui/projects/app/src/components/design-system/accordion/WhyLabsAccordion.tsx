import { Accordion, AccordionControlProps, AccordionItemProps, AccordionPanelProps } from '@mantine/core';
import { AccordionProps } from '@mantine/core/lib/Accordion/Accordion';

export const Root: React.FC<AccordionProps> = ({ children, ...rest }) => {
  return (
    <Accordion radius="xs" {...rest} data-testid="WhyLabsAccordion">
      {children}
    </Accordion>
  );
};

export const Item: React.FC<AccordionItemProps> = ({ children, ...rest }) => {
  return <Accordion.Item {...rest}>{children}</Accordion.Item>;
};

export const Title: React.FC<AccordionControlProps> = ({ children, ...rest }) => {
  return <Accordion.Control {...rest}>{children}</Accordion.Control>;
};

export const Content: React.FC<AccordionPanelProps> = ({ children, ...rest }) => {
  return <Accordion.Panel {...rest}>{children}</Accordion.Panel>;
};

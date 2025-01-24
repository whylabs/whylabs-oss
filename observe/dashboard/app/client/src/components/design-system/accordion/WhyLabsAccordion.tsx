import { Accordion, AccordionControlProps, AccordionItemProps, AccordionPanelProps } from '@mantine/core';
import { AccordionProps } from '@mantine/core/lib/Accordion/Accordion';

export const Root = <Multiple extends boolean = false>({ children, ...rest }: AccordionProps<Multiple>) => {
  return (
    <Accordion radius="xs" {...rest} data-testid="WhyLabsAccordion">
      {children}
    </Accordion>
  );
};

export const Item = ({ children, ...rest }: AccordionItemProps) => {
  return <Accordion.Item {...rest}>{children}</Accordion.Item>;
};

export const Title = ({ children, ...rest }: AccordionControlProps) => {
  return <Accordion.Control {...rest}>{children}</Accordion.Control>;
};

export const Content = ({ children, ...rest }: AccordionPanelProps) => {
  return <Accordion.Panel {...rest}>{children}</Accordion.Panel>;
};

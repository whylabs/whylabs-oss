import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import { ComponentProps } from 'react';
import { WhyLabsAccordion } from '~/components/design-system';

const { getByTestId, getByText } = screen;

const TEST_ID = 'WhyLabsAccordion';

describe('<WhyLabsAccordion />', () => {
  it("should have default testid 'WhyLabsAccordion'", () => {
    getRenderer({ children: <></> });
    expect(getByTestId(TEST_ID)).toBeInTheDocument();
  });

  it.each(['A text', 'Another text'])('should render %p as a accordion title', (expected) => {
    getRenderer({
      children: (
        <WhyLabsAccordion.Item value={expected}>
          <WhyLabsAccordion.Title>{expected}</WhyLabsAccordion.Title>
        </WhyLabsAccordion.Item>
      ),
    });
    expect(getByText(expected)).toBeInTheDocument();
  });

  it.each([
    ['title 1', 'accordion content'],
    ['title 2', 'another content'],
  ])(`should render %p as a title and %p hidden content`, ([title, content]) => {
    getRenderer({
      children: (
        <>
          <WhyLabsAccordion.Item value={title}>
            <WhyLabsAccordion.Title>{title}</WhyLabsAccordion.Title>
            <WhyLabsAccordion.Content>{content}</WhyLabsAccordion.Content>
          </WhyLabsAccordion.Item>
        </>
      ),
    });
    expect(getByText(title)).toBeVisible();
    expect(getByText(content)).not.toBeVisible();
  });

  it.each([
    ['title 1', 'accordion content'],
    ['title 2', 'another content'],
  ])(`should render %p as a title and %p visible content`, ([title, content]) => {
    getRenderer({
      children: (
        <>
          <WhyLabsAccordion.Item value={title}>
            <WhyLabsAccordion.Title>{title}</WhyLabsAccordion.Title>
            <WhyLabsAccordion.Content>{content}</WhyLabsAccordion.Content>
          </WhyLabsAccordion.Item>
        </>
      ),
      value: title,
    });
    expect(getByText(title)).toBeVisible();
    expect(getByText(content)).toBeVisible();
  });
});

// Helpers
type Props = ComponentProps<typeof WhyLabsAccordion.Root>;
function getRenderer({ children, ...props }: Props) {
  return render(
    <MantineProvider>
      <WhyLabsAccordion.Root {...props}>{children}</WhyLabsAccordion.Root>
    </MantineProvider>,
  );
}

import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import { ComponentProps } from 'react';

import { LlmTraceObservationItem } from './LlmTraceObservationItem';

const { getByText } = screen;

describe('<LlmTraceObservationItem />', () => {
  it('should match the snapshot', () => {
    const { container } = getRenderer();
    expect(container).toMatchSnapshot();
  });

  it.each(['Trace', 'Child'])('should render with name %p', (expected) => {
    getRenderer({ name: expected });
    expect(getByText(expected)).toBeInTheDocument();
  });

  it.each(['A description', 'Another description'])('should render with description %p', (expected) => {
    getRenderer({ description: expected });
    expect(getByText(expected)).toBeInTheDocument();
  });

  it.each(['TRACE', 'COMPLETION'])('should render with type %p', (expected) => {
    getRenderer({ type: expected });
    expect(getByText(expected)).toBeInTheDocument();
  });
});

// Helpers
function getRenderer({
  description = 'A description',
  name = 'The name',
  type = 'SPAN',
}: Partial<ComponentProps<typeof LlmTraceObservationItem>> = {}) {
  return render(
    <MantineProvider>
      <LlmTraceObservationItem description={description} name={name} type={type} />
    </MantineProvider>,
  );
}

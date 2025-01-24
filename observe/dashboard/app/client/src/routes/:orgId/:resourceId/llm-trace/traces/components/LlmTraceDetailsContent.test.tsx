import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import { WithTRPC } from '~/decorator/WithTRPC';
import { getByTextContent } from '~/utils/testUtils';
import { ComponentProps } from 'react';
import { MemoryRouter } from 'react-router-dom';

import { TraceContent } from '../types/llmTraceTypes';
import { LlmTraceDetailsContent } from './LlmTraceDetailsContent';
import { createMockedTraceItem } from './mocks/llmTraceMocks';

const { getByText, queryByText } = screen;

describe('<LlmTraceDetailsContent />', () => {
  it('should render empty state message', () => {
    getRenderer({ trace: createMockedTraceItem({ contents: [] }) });
    expect(getByText(/^no content found for the selected trace$/i)).toBeInTheDocument();
  });

  it('should match snapshot', () => {
    const { container } = getRenderer({
      trace: createMockedTraceItem({
        contents: [createContent(), createContent({ title: 'Nullable one', content: null })],
      }),
    });
    expect(container).toMatchSnapshot();
  });

  it.each(['A title', 'Another title'])('should render title %p', (expected) => {
    getRenderer({
      trace: createMockedTraceItem({
        contents: [createContent({ title: expected })],
      }),
    });
    expect(getByText(expected)).toBeInTheDocument();
  });

  it('should render null as content', () => {
    getRenderer({
      trace: createMockedTraceItem({
        contents: [createContent({ content: null })],
      }),
    });
    expect(getByText('null')).toBeInTheDocument();
  });

  it('should render object', () => {
    getRenderer({
      trace: createMockedTraceItem({
        contents: [
          createContent({
            content: {
              name: 'John Doe',
              age: 12,
            },
          }),
        ],
      }),
    });
    expect(getByTextContent(/name/i)).toBeInTheDocument();
    expect(getByText(/^"john doe"$/i)).toBeInTheDocument();
    expect(getByText(/^age$/i)).toBeInTheDocument();
    expect(getByText(/^12$/i)).toBeInTheDocument();
  });

  it('should render array object', () => {
    getRenderer({
      trace: createMockedTraceItem({
        contents: [createContent({ content: ['Something', 'Another thing'] })],
      }),
    });
    expect(getByText(/"something"/i)).toBeInTheDocument();
    expect(getByText(/"another thing"/i)).toBeInTheDocument();
  });

  it.each(['abc', 'cba'])('should display trace ID', (expected) => {
    getRenderer({
      trace: createMockedTraceItem({ id: expected }),
    });
    expect(getByText(expected)).toBeInTheDocument();
  });

  it.each([
    [1700249273024, '2023-11-17 19:27:53 UTC'],
    [1671564990000, '2022-12-20 19:36:30 UTC'],
  ])('should render trace timestamp %p', (startTime, expected) => {
    const trace = createMockedTraceItem({ startTime });
    getRenderer({ trace });
    expect(getByText('Timestamp')).toBeInTheDocument();
    expect(getByText(expected)).toBeInTheDocument();
  });

  it.each(['2.35 sec', '8 sec'])('should render trace latency %p', (expected) => {
    const trace = createMockedTraceItem({ latency: expected });
    getRenderer({ trace });
    expect(getByText('Latency')).toBeInTheDocument();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(getByText(trace.latency!)).toBeInTheDocument();
  });

  it.each(['328 → 207 (535)', '105 → 85 (190)'])('should render trace input and completion tokens %p', (expected) => {
    const trace = createMockedTraceItem({ inputAndCompletionTokens: expected });
    getRenderer({ trace });
    expect(getByText('Tokens (total)')).toBeInTheDocument();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(getByText(trace.inputAndCompletionTokens!)).toBeInTheDocument();
  });

  it('should hide input and completion tokens if not present', () => {
    const trace = createMockedTraceItem({ inputAndCompletionTokens: null });
    getRenderer({ trace });
    expect(queryByText('Tokens (total)')).not.toBeInTheDocument();
  });

  it.each(['SPAN', 'COMPLETION'])('should display trace type', (type) => {
    const trace = createMockedTraceItem({ type });
    getRenderer({ trace });
    expect(getByText(trace.type)).toBeInTheDocument();
  });
});

// Helpers
function getRenderer({ trace = createMockedTraceItem() }: Partial<ComponentProps<typeof LlmTraceDetailsContent>> = {}) {
  return render(
    <MantineProvider>
      <WithTRPC>
        <MemoryRouter>
          <LlmTraceDetailsContent trace={trace} />
        </MemoryRouter>
      </WithTRPC>
    </MantineProvider>,
  );
}

function createContent(custom?: Partial<TraceContent>): TraceContent {
  return {
    title: 'Content title',
    content: {
      title: 'Input',
      content: [
        {
          id: 'v1ql9gl',
          role: 'user',
          content: 'Can you provide an example of a valid credit card number?',
        },
      ],
    },
    ...custom,
  };
}

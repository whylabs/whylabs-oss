import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import { ComponentProps } from 'react';

import { LlmTraceDetailsHeader } from './LlmTraceDetailsHeader';
import { createMockedTraceItem } from './mocks/llmTraceMocks';

const { getByText } = screen;

describe('<LlmTraceDetailsHeader />', () => {
  it.each(['606d328b-76e7-4fcf-a268-f9066559bc99', '8ed11e61-62c5-473a-a2ca-962e4603320c'])(
    'should render Trace id %p',
    (expected) => {
      const trace = createMockedTraceItem({ id: expected });
      getRenderer({ trace });
      expect(getByText('Trace ID')).toBeInTheDocument();
      expect(getByText(trace.id)).toBeInTheDocument();
    },
  );

  it.each([0, 5])('should render total policy issues %p', (expected) => {
    const trace = createMockedTraceItem({ totalPolicyIssues: expected });
    getRenderer({ trace });
    expect(getByText('Total policy issues')).toBeInTheDocument();
    expect(getByText(trace.totalPolicyIssues)).toBeInTheDocument();
  });

  it.each(['2.35 sec', '8 sec'])('should render latency %p', (expected) => {
    const trace = createMockedTraceItem({ latency: expected });
    getRenderer({ trace });
    expect(getByText('Latency')).toBeInTheDocument();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(getByText(trace.latency!)).toBeInTheDocument();
  });

  it.each(['328 → 207 (535)', '105 → 85 (190)'])('should render input and completion tokens %p', (expected) => {
    const trace = createMockedTraceItem({ inputAndCompletionTokens: expected });
    getRenderer({ trace });
    expect(getByText('Tokens (total)')).toBeInTheDocument();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(getByText(trace.inputAndCompletionTokens!)).toBeInTheDocument();
  });
});

// Helpers
function getRenderer({ trace }: ComponentProps<typeof LlmTraceDetailsHeader>) {
  return render(
    <MantineProvider>
      <LlmTraceDetailsHeader trace={trace} />
    </MantineProvider>,
  );
}

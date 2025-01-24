import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import { ComponentProps } from 'react';
import { MemoryRouter } from 'react-router-dom';

import { LlmTraceTable } from './LlmTraceTable';
import { createMockedTraceItem } from './mocks/llmTraceMocks';

const { getAllByRole, getAllByTestId, getByRole, getByTestId, getByText, queryByTestId, queryByText } = screen;

jest.mock('~/routes/:resourceId/llm-trace/LlmTraceLayout', () => ({
  useLlmSecureContext: () => ({
    composedFilterAtom: [],
  }),
}));

const COLUMNS = [
  /^trace id/i,
  /^timestamp/i,
  /^total policy issues/i,
  /^violation tags/i,
  /^application id/i,
  /^latency/i,
  /^token usage \(total\)/i,
  /^version/i,
];

describe('<LlmTraceTable />', () => {
  it('should render all columns', () => {
    getRenderer();
    expect(getAllByRole('columnheader')).toHaveLength(COLUMNS.length);
  });

  it.each(COLUMNS)('should render %p column', (expected) => {
    getRenderer();
    expect(getByRole('columnheader', { name: expected })).toBeInTheDocument();
  });

  it('should render empty state message when there is no data', () => {
    getRenderer();
    expect(getByText(/^no traces found/i)).toBeInTheDocument();
  });

  it('should not render empty state message when there is data', () => {
    getRenderer({ data: [createMockedTraceItem()] });
    expect(queryByText(/^no traces found/i)).not.toBeInTheDocument();
  });

  describe('loading state', () => {
    it('should not render loading state', () => {
      getRenderer();
      expect(queryByTestId('WhyLabsTableLoadingSkeleton')).not.toBeInTheDocument();
    });

    it('should render loading state when isLoading is true', () => {
      getRenderer({ isLoading: true });
      expect(getByTestId('WhyLabsTableLoadingSkeleton')).toBeInTheDocument();
    });
  });

  describe('displaying data', () => {
    it('should render data when there is data', () => {
      const data = [createMockedTraceItem(), createMockedTraceItem(), createMockedTraceItem()];

      getRenderer({ data });
      expect(getAllByRole('row')).toHaveLength(data.length + 1); // +1 for header
      expect(getAllByRole('cell')).toHaveLength(COLUMNS.length * data.length);
    });

    it.each(['111', '123'])('should render trace id %p as a button', (expected) => {
      const data = [createMockedTraceItem({ traceId: expected })];

      getRenderer({ data });
      expect(getByRole('button', { name: expected })).toBeInTheDocument();
    });

    it.each([
      [1700249273024, '2023-11-17 19:27:53 UTC'],
      [1671564990000, '2022-12-20 19:36:30 UTC'],
    ])('should render timestamp %p', (startTime, expected) => {
      const data = [createMockedTraceItem({ startTime })];

      getRenderer({ data });
      expect(getByRole('cell', { name: expected })).toBeInTheDocument();
    });

    it.each([0, 100])('should render total policy issues %p', (expected) => {
      const data = [createMockedTraceItem({ totalPolicyIssues: expected })];
      getRenderer({ data });
      expect(getByRole('cell', { name: expected.toString() })).toBeInTheDocument();
    });

    it.each([[['Toxicity', 'Hallucination']], [['PII']]])('should render violation tags %p', (tags) => {
      const data = [createMockedTraceItem({ parsedTags: tags.map((t) => ({ name: t, label: t })) })];

      getRenderer({ data });
      expect(getAllByTestId('WhyLabsBadge')).toHaveLength(tags.length);
      tags.forEach((t) => expect(getByText(t)).toBeInTheDocument());
    });

    it.each(['app-111', 'app-123'])('should render application id %p as a text', (expected) => {
      const data = [createMockedTraceItem({ applicationId: expected })];

      getRenderer({ data });
      expect(getByRole('cell', { name: expected })).toBeInTheDocument();
    });

    it.each(['5.24 sec', '11,45 sec'])('should render latency %p', (expected) => {
      const data = [createMockedTraceItem({ latency: expected })];

      getRenderer({ data });
      expect(getByRole('cell', { name: expected.toString() })).toBeInTheDocument();
    });

    it.each(['441 → 102 (543)', '789 → 322 (1111)'])('should render token usage %p', (expected) => {
      const data = [createMockedTraceItem({ inputAndCompletionTokens: expected })];

      getRenderer({ data });
      expect(getByRole('cell', { name: expected.toString() })).toBeInTheDocument();
    });

    it.each(['1.0.0', '1.1.0'])('should render version %p', (expected) => {
      const data = [createMockedTraceItem({ version: expected })];

      getRenderer({ data });
      expect(getByRole('cell', { name: expected })).toBeInTheDocument();
    });
  });

  describe('callbacks', () => {
    it('should call onSelectTraceId when trace id is clicked', () => {
      const data = [createMockedTraceItem({ traceId: '333' }), createMockedTraceItem({ traceId: '555' })];
      const onSelectTraceId = jest.fn();

      getRenderer({ data, onSelectTraceId });
      expect(onSelectTraceId).not.toHaveBeenCalled();

      getByRole('button', { name: data[0].traceId }).click();
      expect(onSelectTraceId).toHaveBeenCalledTimes(1);
      expect(onSelectTraceId).toHaveBeenCalledWith(data[0].traceId);

      getByRole('button', { name: data[1].traceId }).click();
      expect(onSelectTraceId).toHaveBeenCalledTimes(2);
      expect(onSelectTraceId).toHaveBeenCalledWith(data[1].traceId);
    });
  });
});

// Helpers
function getRenderer({
  data = [],
  isLoading = false,
  onSelectTraceId = jest.fn(),
}: Partial<ComponentProps<typeof LlmTraceTable>> = {}) {
  return render(
    <MantineProvider>
      <MemoryRouter>
        <LlmTraceTable
          data={data}
          totalEntries={data?.length ?? 0}
          isLoading={isLoading}
          onSelectTraceId={onSelectTraceId}
        />
      </MemoryRouter>
    </MantineProvider>,
  );
}
